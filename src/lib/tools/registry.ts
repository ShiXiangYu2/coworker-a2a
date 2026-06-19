/**
 * Tool Registry — 工具注册表
 *
 * 来源：对齐 claude-code src/constants/tools.ts 的 CORE_TOOLS 模式
 * 扩展：支持动态注册、Agent 权限过滤、按需发现
 *
 * 核心设计：
 * - CORE_TOOLS：始终加载的核心工具白名单
 * - AGENT_DISALLOWED_TOOLS：Agent 禁止使用的工具（防止递归）
 * - 动态注册：运行时可注册新工具
 * - Agent 过滤：根据 Agent ID 返回可用工具列表
 */

import type { AgentId } from '@/lib/agents/types'
import type { CommandPolicy, PermissionProfile, ToolDefinition, ToolRegistry } from './types'

const createdAt = '2026-06-16T00:00:00.000Z'

// ─── CORE_TOOLS 白名单（对齐 claude-code） ───────────────────────────
// 核心工具始终加载，出现在初始 prompt 中
export const CORE_TOOLS = new Set<string>([
  // 文件操作
  'read.project_context',
  'read_simulated.project_summary',
  // Sandbox 写入
  'write.sandbox_deliverable',
  // 内部记录
  'noop.note',
])

// ─── Agent 禁止使用的工具（防止递归调用） ──────────────────────────
// 对齐 claude-code 的 ALL_AGENT_DISALLOWED_TOOLS
export const AGENT_DISALLOWED_TOOLS = new Set<string>([
  // Agent 不应自己停止任务
  // 'task_stop',     // 未来添加
  // Agent 不应自己退出计划模式
  // 'exit_plan_mode', // 未来添加
  // Agent 不应直接询问用户（通过 A2A 消息升级）
  // 'ask_user',      // 未来添加
  // 防止 Agent 递归调用其他 Agent
  // 'agent_dispatch', // 未来添加
])

// ─── 默认 Permission Profile ───────────────────────────────────────

export const defaultPermissionProfile: PermissionProfile = {
  id: 'default-deny-sprint-6',
  name: 'Default Deny Sprint 6',
  description: 'Allows local proposal records only. Denies all real side effects.',
  allowedToolCategories: ['internal_noop', 'read'],
  optionalAllowedToolCategories: ['read_simulated'],
  deniedToolCategories: [
    'read_simulated',
    'read',
    'write',
    'write_sandbox',
    'command',
    'git',
    'pr',
    'deploy',
    'database',
    'external_api',
    'mcp',
    'browser',
  ],
  allowedCommands: [],
  deniedCommands: ['*'],
  allowedPaths: [],
  deniedPaths: ['*'],
  allowExternalApi: false,
  allowShell: false,
  allowGit: false,
  allowFileWrite: false,
  allowPr: false,
  allowDeploy: false,
  allowDelete: false,
  allowDatabaseMigration: false,
  allowMcp: false,
  allowBrowserAutomation: false,
  requiresHumanForRisk: ['medium', 'high', 'critical'],
  maxInputSizeChars: 12000,
  maxResultSizeChars: 12000,
}

// ─── Command Policy ────────────────────────────────────────────────

export const commandPolicy: CommandPolicy = {
  id: 'command-policy-sprint-6',
  version: 'sprint-6',
  defaultDecision: 'deny',
  profiles: [defaultPermissionProfile],
  forbiddenCapabilities: [
    'shell',
    'git',
    'file_write',
    'pr',
    'deploy',
    'delete',
    'database_migration',
    'external_api',
    'mcp',
    'browser',
  ],
  createdAt,
  updatedAt: createdAt,
}

// ─── 静态工具定义（Sprint 6 已有） ────────────────────────────────

export const toolDefinitions: ToolDefinition[] = [
  {
    id: 'write.sandbox_deliverable',
    name: 'write.sandbox_deliverable',
    displayName: 'Sandbox Deliverable Write',
    description:
      'Writes one approved deliverable file under deliverables/. Only .md, .json, or .txt are allowed. It cannot modify source, run Git, call APIs, MCP, or deploy.',
    category: 'write_sandbox',
    version: 'sprint-22',
    inputSchema: {
      type: 'object',
      required: ['targetPath', 'content', 'format'],
      properties: {
        targetPath: { type: 'string' },
        content: { type: 'string' },
        format: { type: 'string' },
      },
    },
    riskLevel: 'medium',
    isReadOnly: false,
    isDestructive: false,
    isOpenWorld: false,
    isCore: true,
    requiresHumanConfirmation: true,
    permissionProfileRef: defaultPermissionProfile.id,
    maxInputSizeChars: 12000,
    maxResultSizeChars: 12000,
    enabled: true,
    sprint6Mode: 'proposal_only',
    sprint11ExecutionMode: 'controlled_deterministic_local',
    executorId: 'write_sandbox_deliverable.executor',
    sandboxId: 'sandbox-file-write-deliverables-sprint-22',
    executionPolicyRef: 'tool-execution-policy-sprint-22',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'noop.note',
    name: 'noop.note',
    displayName: 'Local Note Proposal',
    description: 'Records a local no-op tool proposal for review. It does not execute anything.',
    category: 'internal_noop',
    version: 'sprint-6',
    inputSchema: {
      type: 'object',
      required: ['note'],
      properties: { note: { type: 'string' } },
    },
    riskLevel: 'low',
    isReadOnly: true,
    isDestructive: false,
    isOpenWorld: false,
    isCore: true,
    requiresHumanConfirmation: false,
    permissionProfileRef: defaultPermissionProfile.id,
    maxInputSizeChars: 12000,
    maxResultSizeChars: 12000,
    enabled: true,
    sprint6Mode: 'proposal_only',
    sprint11ExecutionMode: 'controlled_deterministic_local',
    executorId: 'internal_noop.executor',
    sandboxId: 'local-deterministic-sandbox-sprint-11',
    executionPolicyRef: 'tool-execution-policy-sprint-11',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'read_simulated.project_summary',
    name: 'read_simulated.project_summary',
    displayName: 'Simulated Project Summary',
    description:
      'Returns deterministic in-memory fixture data only. It does not read files, network, databases, environment, MCP, browser, or external APIs.',
    category: 'read_simulated',
    version: 'sprint-11',
    inputSchema: {
      type: 'object',
      required: ['key'],
      properties: { key: { type: 'string' } },
    },
    riskLevel: 'low',
    isReadOnly: true,
    isDestructive: false,
    isOpenWorld: false,
    isCore: true,
    requiresHumanConfirmation: false,
    permissionProfileRef: defaultPermissionProfile.id,
    maxInputSizeChars: 12000,
    maxResultSizeChars: 12000,
    enabled: true,
    sprint6Mode: 'proposal_only',
    sprint11ExecutionMode: 'controlled_deterministic_local',
    executorId: 'read_simulated.executor',
    sandboxId: 'local-deterministic-sandbox-sprint-11',
    executionPolicyRef: 'tool-execution-policy-sprint-11',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'read.project_context',
    name: 'read.project_context',
    displayName: 'Project Context Read Proposal',
    description:
      'Represents a future read request. Sprint 6 never reads files, network, MCP, browser, or external APIs.',
    category: 'read',
    version: 'sprint-6',
    inputSchema: {
      type: 'object',
      required: ['scope'],
      properties: { scope: { type: 'string' } },
    },
    riskLevel: 'low',
    isReadOnly: true,
    isDestructive: false,
    isOpenWorld: false,
    isCore: true,
    requiresHumanConfirmation: false,
    permissionProfileRef: defaultPermissionProfile.id,
    enabled: true,
    sprint6Mode: 'proposal_only',
    sprint11ExecutionMode: 'not_executable',
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'command.shell',
    name: 'command.shell',
    displayName: 'Shell Command Proposal',
    description: 'Blocked command proposal. Sprint 6 never executes shell commands.',
    category: 'command',
    version: 'sprint-6',
    inputSchema: {
      type: 'object',
      required: ['command'],
      properties: { command: { type: 'string' } },
    },
    riskLevel: 'critical',
    isReadOnly: false,
    isDestructive: true,
    isOpenWorld: true,
    isCore: false,
    requiresHumanConfirmation: true,
    permissionProfileRef: defaultPermissionProfile.id,
    enabled: false,
    sprint6Mode: 'disabled',
    sprint11ExecutionMode: 'not_executable',
    createdAt,
    updatedAt: createdAt,
  },
]

// ─── 静态 Registry ────────────────────────────────────────────────

export const toolRegistry: ToolRegistry = {
  id: 'tool-registry-sprint-6',
  version: 'sprint-6',
  defaultMode: 'default_deny',
  defaultPermissionProfileRef: defaultPermissionProfile.id,
  tools: toolDefinitions,
  updatedAt: createdAt,
}

// ─── 动态工具注册表（运行时扩展） ──────────────────────────────────

const dynamicTools = new Map<string, ToolDefinition>()

/**
 * 注册新工具（运行时动态添加）
 *
 * 如果 ID 已存在则覆盖（用于升级工具版本）
 */
export function registerTool(definition: ToolDefinition): void {
  dynamicTools.set(definition.id, definition)
}

/**
 * 批量注册工具
 */
export function registerTools(definitions: ToolDefinition[]): void {
  for (const def of definitions) {
    dynamicTools.set(def.id, def)
  }
}

/**
 * 注销工具
 */
export function unregisterTool(toolId: string): boolean {
  return dynamicTools.delete(toolId)
}

// ─── 查询函数 ──────────────────────────────────────────────────────

/**
 * 获取所有工具（静态 + 动态）
 */
export function getAllTools(): ToolDefinition[] {
  const dynamic = Array.from(dynamicTools.values())
  return [...toolDefinitions, ...dynamic]
}

/**
 * 按 ID 或名称查找工具
 */
export function findToolByIdOrName(idOrName: string): ToolDefinition | undefined {
  const normalized = idOrName.trim().toLowerCase()
  return getAllTools().find(
    (tool) => tool.id.toLowerCase() === normalized || tool.name.toLowerCase() === normalized
  )
}

/**
 * 按 ID 查找工具
 */
export function getToolById(id: string): ToolDefinition | undefined {
  return getAllTools().find((tool) => tool.id === id)
}

/**
 * 获取核心工具列表
 */
export function getCoreTools(): ToolDefinition[] {
  return getAllTools().filter((tool) => tool.isCore === true || CORE_TOOLS.has(tool.id))
}

/**
 * 获取非核心工具列表（按需发现）
 */
export function getDeferredTools(): ToolDefinition[] {
  return getAllTools().filter((tool) => tool.isCore !== true && !CORE_TOOLS.has(tool.id))
}

// ─── Agent 权限检查 ────────────────────────────────────────────────

/**
 * 获取指定 Agent 可用的工具列表
 *
 * 过滤逻辑：
 * 1. 工具必须 enabled
 * 2. 不在 AGENT_DISALLOWED_TOOLS 中
 * 3. 如果工具指定了 allowedAgentIds，Agent 必须在列表中
 */
export function getToolsForAgent(agentId: AgentId): ToolDefinition[] {
  return getAllTools().filter((tool) => {
    if (!tool.enabled) return false
    if (AGENT_DISALLOWED_TOOLS.has(tool.id)) return false
    if (tool.allowedAgentIds && !tool.allowedAgentIds.includes(agentId)) return false
    return true
  })
}

/**
 * 获取指定 Agent 可用的核心工具
 */
export function getCoreToolsForAgent(agentId: AgentId): ToolDefinition[] {
  return getToolsForAgent(agentId).filter(
    (tool) => tool.isCore === true || CORE_TOOLS.has(tool.id)
  )
}

/**
 * 检查工具是否允许指定 Agent 使用
 */
export function isToolAllowedForAgent(toolId: string, agentId: AgentId): boolean {
  if (AGENT_DISALLOWED_TOOLS.has(toolId)) return false
  const tool = getToolById(toolId)
  if (!tool) return false
  if (!tool.enabled) return false
  if (tool.allowedAgentIds && !tool.allowedAgentIds.includes(agentId)) return false
  return true
}

/**
 * 获取指定类别的工具
 */
export function getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
  return getAllTools().filter((tool) => tool.category === category && tool.enabled)
}

// ─── Permission Profile 查询 ───────────────────────────────────────

export function getPermissionProfile(id: string): PermissionProfile | undefined {
  return commandPolicy.profiles.find((profile) => profile.id === id)
}
