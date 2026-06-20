/**
 * Obsidian Adapter — Obsidian MCP 适配器
 *
 * 连接 Obsidian 知识库，支持：
 *   - 读取笔记
 *   - 写入笔记
 *   - 搜索笔记
 *   - 列出目录
 *
 * 配置：
 *   OBSIDIAN_API_URL: Obsidian Local REST API 地址
 *   OBSIDIAN_API_KEY: Obsidian API 密钥
 */

import type { KnowledgeEntry } from './types'

// ─── 配置 ──────────────────────────────────────────────────────────

function getObsidianConfig() {
  return {
    apiUrl: process.env.OBSIDIAN_API_URL ?? 'http://localhost:27123',
    apiKey: process.env.OBSIDIAN_API_KEY ?? '',
    vault: process.env.OBSIDIAN_VAULT ?? '',
  }
}

function isConfigured(): boolean {
  const config = getObsidianConfig()
  return !!(config.apiUrl && config.apiKey)
}

// ─── API 请求 ──────────────────────────────────────────────────────

async function obsidianFetch(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ status: number; data: unknown }> {
  const config = getObsidianConfig()

  if (!config.apiKey) {
    throw new Error('OBSIDIAN_API_KEY not configured')
  }

  const url = `${config.apiUrl}/vault/${config.vault ? config.vault + '/' : ''}${path}`

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  let data: unknown
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorMsg = (data as Record<string, unknown>)?.message ?? response.statusText
    throw new Error(`Obsidian API error (${response.status}): ${errorMsg}`)
  }

  return { status: response.status, data }
}

// ─── 读取操作 ──────────────────────────────────────────────────────

/**
 * 读取笔记内容
 */
export async function readNote(notePath: string): Promise<string | null> {
  if (!isConfigured()) return null

  try {
    const { data } = await obsidianFetch(`${notePath}`)
    return (data as { content?: string })?.content ?? null
  } catch {
    return null
  }
}

/**
 * 列出目录
 */
export async function listDirectory(dirPath: string = ''): Promise<string[]> {
  if (!isConfigured()) return []

  try {
    const { data } = await obsidianFetch(`${dirPath}`)
    return (data as { files?: string[] })?.files ?? []
  } catch {
    return []
  }
}

/**
 * 搜索笔记
 */
export async function searchNotes(query: string): Promise<Array<{
  path: string
  title: string
  score: number
}>> {
  if (!isConfigured()) return []

  try {
    const { data } = await obsidianFetch(`search/${encodeURIComponent(query)}`)
    const results = (data as { results?: Array<{ path: string; score: number }> })?.results ?? []
    return results.map((r) => ({
      path: r.path,
      title: r.path.split('/').pop()?.replace('.md', '') ?? '',
      score: r.score,
    }))
  } catch {
    return []
  }
}

// ─── 写入操作 ──────────────────────────────────────────────────────

/**
 * 写入笔记
 */
export async function writeNote(
  notePath: string,
  content: string,
): Promise<boolean> {
  if (!isConfigured()) return false

  try {
    await obsidianFetch(`${notePath}`, {
      method: 'PUT',
      body: { content },
    })
    return true
  } catch {
    return false
  }
}

/**
 * 追加到笔记
 */
export async function appendNote(
  notePath: string,
  content: string,
): Promise<boolean> {
  if (!isConfigured()) return false

  try {
    const existing = await readNote(notePath)
    const newContent = existing ? `${existing}\n\n${content}` : content
    return writeNote(notePath, newContent)
  } catch {
    return false
  }
}

// ─── 知识同步 ──────────────────────────────────────────────────────

/**
 * 从 Obsidian 导入知识
 */
export async function importFromObsidian(
  notePath: string,
): Promise<KnowledgeEntry | null> {
  const content = await readNote(notePath)
  if (!content) return null

  // 解析笔记内容
  const title = notePath.split('/').pop()?.replace('.md', '') ?? 'Untitled'
  const tags = extractTags(content)
  const type = inferKnowledgeType(content)

  return {
    id: `obsidian-${notePath.replace(/\//g, '-')}`,
    type,
    title,
    content: content.slice(0, 5000), // 限制长度
    tags,
    source: 'obsidian',
    applicableTo: [],
    usageCount: 0,
    successRate: 0.8,
    confidence: 0.7,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * 导出知识到 Obsidian
 */
export async function exportToObsidian(
  entry: KnowledgeEntry,
  folder: string = 'CoWorker/Knowledge',
): Promise<boolean> {
  const notePath = `${folder}/${entry.title.replace(/[\/\\]/g, '-')}.md`
  const content = formatNoteContent(entry)
  return writeNote(notePath, content)
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function extractTags(content: string): string[] {
  const tagMatches = content.match(/#([\w-]+)/g) ?? []
  return tagMatches.map((t) => t.slice(1))
}

function inferKnowledgeType(content: string): KnowledgeEntry['type'] {
  const lower = content.toLowerCase()
  if (lower.includes('workflow') || lower.includes('流程')) return 'workflow_template'
  if (lower.includes('plan') || lower.includes('计划')) return 'execution_plan'
  if (lower.includes('pattern') || lower.includes('模式')) return 'judgment_pattern'
  if (lower.includes('debt') || lower.includes('债务')) return 'debt_case'
  if (lower.includes('failure') || lower.includes('失败')) return 'failure_pattern'
  if (lower.includes('fix') || lower.includes('修复')) return 'fix_pattern'
  if (lower.includes('best practice') || lower.includes('最佳实践')) return 'best_practice'
  if (lower.includes('lesson') || lower.includes('经验')) return 'lesson_learned'
  return 'best_practice'
}

function formatNoteContent(entry: KnowledgeEntry): string {
  const lines = [
    `---`,
    `type: ${entry.type}`,
    `tags: [${entry.tags.join(', ')}]`,
    `source: ${entry.source}`,
    `confidence: ${entry.confidence}`,
    `created: ${entry.createdAt}`,
    `---`,
    '',
    `# ${entry.title}`,
    '',
    entry.content,
  ]

  if (entry.applicableTo.length > 0) {
    lines.push('', '## 适用场景', '', ...entry.applicableTo.map((a) => `- ${a}`))
  }

  return lines.join('\n')
}

/**
 * 获取 Obsidian 状态
 */
export function getObsidianStatus(): {
  configured: boolean
  apiUrl: string
  vault: string
} {
  const config = getObsidianConfig()
  return {
    configured: isConfigured(),
    apiUrl: config.apiUrl,
    vault: config.vault,
  }
}
