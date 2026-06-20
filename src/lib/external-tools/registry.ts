/**
 * External Tool Registry — 外部工具注册表
 *
 * 管理所有已注册的外部工具，支持：
 * - 工具注册/注销
 * - 工具发现和查询
 * - 工具执行
 * - 健康检查
 *
 * 与 Tool Registry（内部工具）的区别：
 * - Tool Registry：管理 Agent 可用的内部工具（sandbox、file_write 等）
 * - External Tool Registry：管理外部 API/Webhook/MCP 工具
 *
 * 安全：
 *   - 外部工具默认需要人工确认
 *   - 工具执行记录审计日志
 *   - 敏感数据自动过滤
 */

import type {
  ExternalToolDefinition,
  ExternalToolExecutor,
  ExternalToolResult,
  ExternalToolType,
} from './types'

// ─── 注册表实现 ────────────────────────────────────────────────────

const tools = new Map<string, ExternalToolExecutor>()

/**
 * 注册外部工具
 */
export function registerExternalTool(executor: ExternalToolExecutor): void {
  tools.set(executor.definition.id, executor)
  console.log(
    `[ExternalToolRegistry] Registered: ${executor.definition.id} (${executor.definition.type})`
  )
}

/**
 * 注销外部工具
 */
export function unregisterExternalTool(toolId: string): boolean {
  const deleted = tools.delete(toolId)
  if (deleted) {
    console.log(`[ExternalToolRegistry] Unregistered: ${toolId}`)
  }
  return deleted
}

/**
 * 获取外部工具执行器
 */
export function getExternalTool(toolId: string): ExternalToolExecutor | undefined {
  return tools.get(toolId)
}

/**
 * 列出所有外部工具定义
 */
export function listExternalTools(): ExternalToolDefinition[] {
  return Array.from(tools.values()).map((e) => e.definition)
}

/**
 * 按类别列出外部工具
 */
export function listExternalToolsByCategory(category: string): ExternalToolDefinition[] {
  return listExternalTools().filter((t) => t.category === category)
}

/**
 * 按类型列出外部工具
 */
export function listExternalToolsByType(type: ExternalToolType): ExternalToolDefinition[] {
  return listExternalTools().filter((t) => t.type === type)
}

/**
 * 检查工具是否可用
 */
export function isExternalToolAvailable(toolId: string): boolean {
  const executor = tools.get(toolId)
  if (!executor) return false
  return executor.definition.status === 'active'
}

/**
 * 执行外部工具
 */
export async function executeExternalTool(
  toolId: string,
  input: Record<string, unknown>,
): Promise<ExternalToolResult> {
  const executor = tools.get(toolId)
  if (!executor) {
    return {
      success: false,
      output: { error: `External tool not found: ${toolId}` },
      error: `External tool not found: ${toolId}`,
      durationMs: 0,
      retryCount: 0,
      toolId,
      timestamp: new Date().toISOString(),
    }
  }

  if (executor.definition.status !== 'active') {
    return {
      success: false,
      output: { error: `External tool is not active: ${toolId} (status: ${executor.definition.status})` },
      error: `External tool is not active: ${toolId}`,
      durationMs: 0,
      retryCount: 0,
      toolId,
      timestamp: new Date().toISOString(),
    }
  }

  return executor.execute(input)
}

/**
 * 批量健康检查
 */
export async function healthCheckAll(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}

  const checks = Array.from(tools.entries()).map(async ([id, executor]) => {
    try {
      results[id] = await executor.healthCheck()
    } catch {
      results[id] = false
    }
  })

  await Promise.all(checks)
  return results
}

/**
 * 获取注册表统计信息
 */
export function getRegistryStats(): {
  total: number
  active: number
  inactive: number
  byType: Record<string, number>
  byCategory: Record<string, number>
} {
  const allTools = listExternalTools()
  const byType: Record<string, number> = {}
  const byCategory: Record<string, number> = {}

  for (const tool of allTools) {
    byType[tool.type] = (byType[tool.type] ?? 0) + 1
    byCategory[tool.category] = (byCategory[tool.category] ?? 0) + 1
  }

  return {
    total: allTools.length,
    active: allTools.filter((t) => t.status === 'active').length,
    inactive: allTools.filter((t) => t.status !== 'active').length,
    byType,
    byCategory,
  }
}
