import { prisma } from '@/lib/prisma'
import type { AgentId } from '@/lib/agents/types'
import { searchMemory } from '@/lib/memory/embedding'

const MAX_CONTEXT_LENGTH = 4000
const MAX_COMPLETED_RESULTS = 5
const MAX_A2A_MESSAGES = 10
const MAX_MEMORY_ENTRIES = 5

const SENSITIVE_PATTERNS = [
  /api[_-]?key[:\s]*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/gi,
  /token[:\s]*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/gi,
  /password[:\s]*[=:]\s*['"]?[^\s'"]+/gi,
  /secret[:\s]*[=:]\s*['"]?[A-Za-z0-9_\-]{20,}/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9_\-.]{20,}/g,
]

function redactSensitiveInfo(text: string): string {
  let result = text
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

function decodeJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

interface ResolvedContext {
  context: string
  stats: {
    completedResults: number
    a2aMessages: number
    memoryEntries: number
    totalLength: number
  }
}

interface ContextMemoryRecord {
  kind: string
  title: string
  content: string
  score: number
}

export async function resolveAgentContext(
  agentId: AgentId,
  taskId: string,
  conversationId?: string | null
): Promise<ResolvedContext | null> {
  if (!conversationId) return null

  const sections: string[] = []
  let totalLength = 0
  const stats = { completedResults: 0, a2aMessages: 0, memoryEntries: 0, totalLength: 0 }

  const completedRuns = (await prisma.agentRun.findMany({
    where: {
      task: { conversationId },
      status: 'completed',
      agentId: { not: agentId },
    },
    include: {
      task: { select: { title: true, id: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: MAX_COMPLETED_RESULTS,
  })).filter((run) => run.agentId !== agentId)

  if (completedRuns.length > 0) {
    const results: string[] = []
    for (const run of completedRuns) {
      const result = decodeJson<{ summary?: string; findings?: string[] } | null>(run.resultJson, null)
      if (!result) continue

      const agentName = run.agentId
      const taskTitle = run.task?.title ?? 'Unknown task'
      const summary = redactSensitiveInfo(result.summary ?? '')
      const findings = (result.findings ?? [])
        .map((finding) => redactSensitiveInfo(String(finding)))
        .slice(0, 3)

      const section = [
        `- Agent: ${agentName}`,
        `  任务: ${taskTitle}`,
        `  总结: ${truncate(summary, 200)}`,
        ...(findings.length > 0 ? [`  发现: ${findings.map((f) => truncate(f, 100)).join('; ')}`] : []),
      ].join('\n')

      if (totalLength + section.length > MAX_CONTEXT_LENGTH) break
      results.push(section)
      totalLength += section.length
    }

    if (results.length > 0) {
      sections.push(`### 其他 Agent 的已完成分析\n\n${results.join('\n\n')}`)
      stats.completedResults = results.length
    }
  }

  const a2aMessages = await prisma.a2AMessage.findMany({
    where: {
      task: { conversationId },
      status: { in: ['sent', 'delivered', 'reviewed'] },
    },
    orderBy: { createdAt: 'desc' },
    take: MAX_A2A_MESSAGES,
  })

  if (a2aMessages.length > 0) {
    const messages: string[] = []
    for (const msg of a2aMessages) {
      const body = redactSensitiveInfo(truncate(msg.body, 150))
      const section = `- ${msg.fromAgentId} → ${msg.toAgentId} [${msg.intent}]: ${msg.subject}\n  ${body}`

      if (totalLength + section.length > MAX_CONTEXT_LENGTH) break
      messages.push(section)
      totalLength += section.length
    }

    if (messages.length > 0) {
      sections.push(`### Agent 间通信记录\n\n${messages.join('\n')}`)
      stats.a2aMessages = messages.length
    }
  }

  const queryText = [
    ...completedRuns.map((run) => run.task?.title ?? ''),
    ...a2aMessages.map((msg) => `${msg.subject} ${msg.body}`),
  ].join(' ').slice(0, 500)

  const memoryResults = queryText.trim()
    ? await searchMemory(queryText, {
        limit: MAX_MEMORY_ENTRIES,
        minScore: 0.15,
        conversationId,
        activeOnly: true,
      })
    : []

  const eligibleMemoryResults = memoryResults.filter((result) => result.entry.agentId !== agentId)

  let allMemoryEntries: ContextMemoryRecord[] = eligibleMemoryResults.length > 0
    ? eligibleMemoryResults.map((result) => ({
        kind: result.entry.kind,
        title: result.entry.title,
        content: result.entry.content,
        score: result.score,
      }))
    : []

  if (allMemoryEntries.length === 0) {
    const taskMemoryEntries = await prisma.memoryEntry.findMany({
      where: {
        taskId,
        status: 'active',
        agentId: { not: agentId },
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_MEMORY_ENTRIES,
    })

    allMemoryEntries = taskMemoryEntries.map((entry) => ({
      kind: entry.kind,
      title: entry.title,
      content: entry.content,
      score: 0,
    }))

    if (allMemoryEntries.length === 0) {
      const conversationMemoryEntries = await prisma.memoryEntry.findMany({
        where: {
          task: { conversationId },
          status: 'active',
          agentId: { not: agentId },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_MEMORY_ENTRIES,
      })

      allMemoryEntries = conversationMemoryEntries.map((entry) => ({
        kind: entry.kind,
        title: entry.title,
        content: entry.content,
        score: 0,
      }))
    }
  }

  if (allMemoryEntries.length > 0) {
    const entries: string[] = []
    for (const entry of allMemoryEntries) {
      const content = redactSensitiveInfo(truncate(entry.content, 200))
      const scoreLabel = entry.score > 0 ? ` (相似度: ${entry.score.toFixed(2)})` : ''
      const section = `- [${entry.kind}] ${entry.title}${scoreLabel}\n  ${content}`

      if (totalLength + section.length > MAX_CONTEXT_LENGTH) break
      entries.push(section)
      totalLength += section.length
    }

    if (entries.length > 0) {
      sections.push(`### 相关记忆\n\n${entries.join('\n')}`)
      stats.memoryEntries = entries.length
    }
  }

  if (sections.length === 0) return null

  const context = sections.join('\n\n---\n\n')
  stats.totalLength = context.length

  return {
    context: truncate(context, MAX_CONTEXT_LENGTH),
    stats,
  }
}
