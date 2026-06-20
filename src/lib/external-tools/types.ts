/**
 * External Tool Types — 外部工具类型定义
 *
 * 定义外部工具集成的标准接口。
 * 支持 HTTP API、Webhook、MCP 等多种外部工具类型。
 */

// ─── 工具定义 ──────────────────────────────────────────────────────

export type ExternalToolType = 'http_api' | 'webhook' | 'mcp' | 'custom'

export type ExternalToolStatus = 'active' | 'inactive' | 'error' | 'rate_limited'

export interface ExternalToolDefinition {
  /** 工具唯一 ID */
  id: string
  /** 工具名称 */
  name: string
  /** 工具描述 */
  description: string
  /** 工具类型 */
  type: ExternalToolType
  /** 工具版本 */
  version: string
  /** 工具状态 */
  status: ExternalToolStatus
  /** 工具类别（用于权限控制） */
  category: string
  /** 风险等级 */
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  /** 是否需要人工确认 */
  requiresHumanConfirmation: boolean
  /** 输入 schema（JSON Schema） */
  inputSchema: Record<string, unknown>
  /** 输出 schema（JSON Schema） */
  outputSchema?: Record<string, unknown>
  /** 超时毫秒数 */
  timeoutMs: number
  /** 最大重试次数 */
  maxRetries: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ─── 工具配置 ──────────────────────────────────────────────────────

export interface HttpApiConfig {
  /** API 基础 URL */
  baseUrl: string
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  /** 请求路径模板（支持 {param} 占位符） */
  pathTemplate: string
  /** 请求头 */
  headers?: Record<string, string>
  /** 认证配置 */
  auth?: {
    type: 'bearer' | 'api_key' | 'basic' | 'oauth2'
    /** 环境变量名（不存储实际密钥） */
    secretEnvVar: string
    /** API Key 的 header 名（api_key 类型） */
    keyHeader?: string
  }
  /** 查询参数模板 */
  queryTemplate?: Record<string, string>
  /** 请求体模板（JSON 字符串） */
  bodyTemplate?: string
  /** 响应提取路径（JSONPath 简化版） */
  responseExtractPath?: string
}

export interface WebhookConfig {
  /** Webhook URL */
  url: string
  /** 请求方法（通常 POST） */
  method: 'POST' | 'PUT'
  /** 请求头 */
  headers?: Record<string, string>
  /** 签名密钥环境变量（用于验证） */
  signatureSecretEnvVar?: string
  /** 签名算法 */
  signatureAlgorithm?: 'sha256' | 'sha512'
}

export interface McpConfig {
  /** MCP 服务器 URL */
  serverUrl: string
  /** 工具名称（MCP 协议中的工具名） */
  mcpToolName: string
  /** 服务器版本 */
  serverVersion?: string
  /** 认证配置 */
  auth?: {
    type: 'bearer' | 'api_key'
    secretEnvVar: string
  }
}

// ─── 执行结果 ──────────────────────────────────────────────────────

export interface ExternalToolResult {
  /** 是否成功 */
  success: boolean
  /** 输出数据 */
  output: unknown
  /** 错误信息 */
  error?: string
  /** HTTP 状态码（HTTP API 类型） */
  statusCode?: number
  /** 响应头 */
  headers?: Record<string, string>
  /** 执行耗时毫秒 */
  durationMs: number
  /** 重试次数 */
  retryCount: number
  /** 工具 ID */
  toolId: string
  /** 时间戳 */
  timestamp: string
}

// ─── 工具执行器接口 ────────────────────────────────────────────────

export interface ExternalToolExecutor {
  /** 工具定义 */
  definition: ExternalToolDefinition
  /** 执行工具 */
  execute(input: Record<string, unknown>): Promise<ExternalToolResult>
  /** 健康检查 */
  healthCheck(): Promise<boolean>
}

// ─── 工具注册表 ────────────────────────────────────────────────────

export interface ExternalToolRegistry {
  /** 注册工具 */
  register(executor: ExternalToolExecutor): void
  /** 注销工具 */
  unregister(toolId: string): boolean
  /** 获取工具 */
  get(toolId: string): ExternalToolExecutor | undefined
  /** 列出所有工具 */
  list(): ExternalToolDefinition[]
  /** 按类别列出 */
  listByCategory(category: string): ExternalToolDefinition[]
  /** 检查工具是否可用 */
  isAvailable(toolId: string): boolean
}
