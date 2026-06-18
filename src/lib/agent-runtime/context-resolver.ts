/**
 * Agent Context Resolver
 *
 * 在 Agent 执行前，查询同一 conversation 下其他 Agent 的历史输出，
 * 组装为上下文注入 System Prompt，实现多 Agent 协作的上下文传递。
 *
 * 约束：
 * - 上下文总长度不超过 4000 字符
 * - 只查询已完成的任务结果，不查询进行中的
 * - 敏感信息（API Key 等）不注入上下文
 */

import { prisma } from '@/lib/prisma'
import type { AgentId } from '@/lib/agents/types'
import { searchMemory } from '@/lib/memory/embedding'

const MAX_CONTEXT_LENGTH = 4000
const MAX_COMPLETED_RESULTS = 5
const MAX_A2A_MESSAGES = 10
const MAX_MEMORY_ENTRIES = 5

/**
 * 敏感信息过滤正则
 * 匹配 API Key、Token、密码等模式
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key[:\s]*[=:]\s*['""]?[A-Za-z0-9_\-]{20,}/gi,
  /token[:\s]*[=:]\s*['""]?[A-Za-z0-9_\-]{20,}/gi,
  /password[:\s]*[=:]\s*['""]?[^\s'""]+/gi,
  /secret[:\s]*[=:]\s*['""]?[A-Za-z0-9_\-]{20,}/gi,
  /sk-[A-Za-z0-9]{20,}/g,
  /Bearer\s+[A-Za-z0-9_\-\.]{20,}/g,
]

/**
 * 过滤敏感信息
 */
function redactSensitiveInfo(text: string): string {
  let result = text
  for (const pattern of SENSITIVE_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

/**
 * 截断文本到指定长度
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}

/**
 * 解码 JSON 字符串，失败时返回 fallback
 */
function decodeJson<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

interface ResolvedContext {
  /** 组装好的上下文字符串，可直接注入 System Prompt */
  context: string
  /** 来源统计 */
  stats: {
    completedResults: number
    a2aMessages: number
    memoryEntries: number
    totalLength: number
  }
}

/**
 * 解析 Agent 执行上下文
 *
 * 查询同一 conversation 下其他 Agent 的已完成结果、A2A 消息、相关记忆，
 * 组装为上下文字符串注入 System Prompt。
 */
export async function resolveAgentContext(
  agentId: AgentId,
  taskId: string,
  conversationId?: string | null
): Promise<ResolvedContext | null> {
  if (!conversationId) return null

  const sections: string[] = []
  let totalLength = 0
  const stats = { completedResults: 0, a2aMessages: 0, memoryEntries: 0, totalLength: 0 }

  // ─── 1. 查询同 conversation 下已完成的 AgentResult（最近 5 条） ───
  const completedRuns = await prisma.agentRun.findMany({
    where: {
      task: { conversationId },
      status: 'completed',
      agentId: { not: agentId }, // 排除自己的历史
    },
    include: {
      task: { select: { title: true, id: true } },
    },
    orderBy: { completedAt: 'desc' },
    take: MAX_COMPLETED_RESULTS,
  })

  if (completedRuns.length > 0) {
    const results: string[] = []
    for (const run of completedRuns) {
      const result = decodeJson<{ summary?: string; findings?: string[] } | null>(run.resultJson, null)
      if (!result) continue

      const agentName = run.agentId
      const taskTitle = run.task?.title ?? 'Unknown task'
      const summary = redactSensitiveInfo(result.summary ?? '')
      const findings = (result.findings ?? [])
        .map((f) => redactSensitiveInfo(String(f)))
        .slice(0, 3) // 最多 3 条 findings

      const section = [
        `- Agent: ${agentName}`,
        `  任务: ${taskTitle}`,
        `  总结: ${truncate(summary, 200)}`,
        ...(findings.length > 0 ? [`  发现: ${findings.map((f) => truncate(f, 100)).join('; ')}`] : []),
      ].join('\n')

      const sectionLength = section.length
      if (totalLength + sectionLength > MAX_CONTEXT_LENGTH) break
      results.push(section)
      totalLength += sectionLength
    }

    if (results.length > 0) {
      sections.push(`### 其他 Agent 的已完成分析\n\n${results.join('\n\n')}`)
      stats.completedResults = results.length
    }
  }

  // ─── 2. 查询同 conversation 下的 A2AMessage（最近 10 条） ───
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

      const sectionLength = section.length
      if (totalLength + sectionLength > MAX_CONTEXT_LENGTH) break
      messages.push(section)
      totalLength += sectionLength
    }

    if (messages.length > 0) {
      sections.push(`### Agent 间通信记录\n\n${messages.join('\n')}`)
      stats.a2aMessages = messages.length
    }
  }

  // ─── 3. 语义检索 MemoryEntry（TF-IDF + 余弦相似度） ───
  // 构建查询文本：从任务上下文中提取关键词
  const queryText = [
    ...completedRuns.map((r) => r.task?.title ?? ''),
    ...a2aMessages.map((m) => `${m.subject} ${m.body}`),
  ].join(' ').slice(0, 500) // 限制查询文本长度

  // 如果有可查询的文本，进行语义检索
  const memoryResults = queryText.trim()
    ? await searchMemory(queryText, {
        limit: MAX_MEMORY_ENTRIES,
        minScore: 0.15,
        conversationId,
        activeOnly: true,
      })
    : []

  // 如果语义检索没有结果，回退到 taskId 匹配
  const allMemoryEntries = memoryResults.length > 0
    ? memoryResults.map((r) => ({
        kind: r.entry.kind,
        title: r.entry.title,
        content: r.entry.content,
        score: r.score,
      }))
    : (await prisma.memoryEntry.findMany({
        where: {
          task: { conversationId },
          status: 'active',
          agentId: { not: agentId },
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_MEMORY_ENTRIES,
      })).map((e) => ({
          kind: e.kind,
          title: e.title,
          content: e.content,
          score: 0,
        }))

  if (allMemoryEntries.length > 0) {
    const entries: string[] = []
    for (const entry of allMemoryEntries) {
      const content = redactSensitiveInfo(truncate(entry.content, 200))
      const scoreLabel = entry.score > 0 ? ` (相似度: ${entry.score.toFixed(2)})` : ''
      const section = `- [${entry.kind}] ${entry.title}${scoreLabel}\n  ${content}`

      const sectionLength = section.length
      if (totalLength + sectionLength > MAX_CONTEXT_LENGTH) break
      entries.push(section)
      totalLength += sectionLength
    }

    if (entries.length > 0) {
      sections.push(`### 相关记忆\n\n${entries.join('\n')}`)
      stats.memoryEntries = entries.length
    }
  }

  // ─── 4. 组装最终上下文 ───
  if (sections.length === 0) return null

  const context = sections.join('\n\n---\n\n')
  stats.totalLength = context.length

  return {
    context: truncate(context, MAX_CONTEXT_LENGTH),
    stats,
  }
}
