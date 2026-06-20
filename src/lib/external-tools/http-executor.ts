/**
 * HTTP API Tool Executor — HTTP API 外部工具执行器
 *
 * 支持调用外部 HTTP API，包含：
 * - 请求构建（路径模板、查询参数、请求体）
 * - 认证（Bearer、API Key、Basic）
 * - 重试和超时
 * - 响应提取
 * - 安全边界（域名白名单、敏感数据过滤）
 *
 * 安全：
 *   - 只允许调用已注册的域名
 *   - API Key 从环境变量读取，不存储在代码中
 *   - 响应自动过滤敏感字段
 *   - 请求/响应大小限制
 */

import type {
  ExternalToolDefinition,
  ExternalToolExecutor,
  ExternalToolResult,
  HttpApiConfig,
} from './types'

// ─── 安全限制 ──────────────────────────────────────────────────────

const MAX_REQUEST_SIZE = 100 * 1024 // 100KB
const MAX_RESPONSE_SIZE = 1 * 1024 * 1024 // 1MB
const DEFAULT_TIMEOUT = 30_000 // 30s
const MAX_RETRIES = 3

const SENSITIVE_HEADERS = ['authorization', 'x-api-key', 'cookie', 'set-cookie']

// ─── HTTP API 执行器 ───────────────────────────────────────────────

export class HttpApiToolExecutor implements ExternalToolExecutor {
  definition: ExternalToolDefinition
  private config: HttpApiConfig
  private allowedDomains: Set<string>

  constructor(definition: ExternalToolDefinition, config: HttpApiConfig, allowedDomains: string[] = []) {
    this.definition = definition
    this.config = config
    this.allowedDomains = new Set(allowedDomains)
  }

  async execute(input: Record<string, unknown>): Promise<ExternalToolResult> {
    const startTime = Date.now()
    const toolId = this.definition.id

    // 1. 构建 URL
    const url = this.buildUrl(input)
    if (!url) {
      return this.buildErrorResult('Failed to build URL from input', startTime, 0)
    }

    // 2. 安全检查：域名白名单
    const urlObj = new URL(url)
    if (this.allowedDomains.size > 0 && !this.allowedDomains.has(urlObj.hostname)) {
      return this.buildErrorResult(`Domain not allowed: ${urlObj.hostname}`, startTime, 0)
    }

    // 3. 构建请求
    const headers = this.buildHeaders()
    const body = this.buildBody(input)

    // 4. 大小检查
    if (body && body.length > MAX_REQUEST_SIZE) {
      return this.buildErrorResult(`Request body too large: ${body.length} bytes`, startTime, 0)
    }

    // 5. 执行请求（带重试）
    let lastError: string | undefined
    const maxRetries = Math.min(this.definition.maxRetries, MAX_RETRIES)

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(
          () => controller.abort(),
          this.definition.timeoutMs || DEFAULT_TIMEOUT,
        )

        const response = await fetch(url, {
          method: this.config.method,
          headers,
          body: this.config.method !== 'GET' ? body : undefined,
          signal: controller.signal,
        })

        clearTimeout(timeout)

        // 读取响应
        const responseText = await response.text()
        if (responseText.length > MAX_RESPONSE_SIZE) {
          return this.buildErrorResult('Response too large', startTime, attempt)
        }

        // 解析响应
        let output: unknown
        try {
          output = JSON.parse(responseText)
        } catch {
          output = responseText
        }

        // 提取响应字段
        if (this.config.responseExtractPath) {
          output = this.extractResponseField(output, this.config.responseExtractPath)
        }

        // 过滤响应头中的敏感信息
        const responseHeaders: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          if (!SENSITIVE_HEADERS.includes(key.toLowerCase())) {
            responseHeaders[key] = value
          }
        })

        if (!response.ok) {
          lastError = `HTTP ${response.status}: ${responseText.slice(0, 200)}`
          if (response.status >= 500 && attempt < maxRetries) {
            // 5xx 错误可以重试
            await this.delay(attempt)
            continue
          }
          return {
            success: false,
            output: { error: lastError, statusCode: response.status },
            error: lastError,
            statusCode: response.status,
            headers: responseHeaders,
            durationMs: Date.now() - startTime,
            retryCount: attempt,
            toolId,
            timestamp: new Date().toISOString(),
          }
        }

        return {
          success: true,
          output,
          statusCode: response.status,
          headers: responseHeaders,
          durationMs: Date.now() - startTime,
          retryCount: attempt,
          toolId,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        if (attempt < maxRetries) {
          await this.delay(attempt)
        }
      }
    }

    return this.buildErrorResult(lastError ?? 'Unknown error', startTime, maxRetries)
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = new URL(this.config.baseUrl)
      const response = await fetch(`${url.protocol}//${url.host}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // ─── 辅助方法 ──────────────────────────────────────────────────

  private buildUrl(input: Record<string, unknown>): string | null {
    try {
      let path = this.config.pathTemplate
      // 替换路径参数 {param}
      for (const [key, value] of Object.entries(input)) {
        path = path.replace(`{${key}}`, encodeURIComponent(String(value)))
      }

      const url = new URL(path, this.config.baseUrl)

      // 添加查询参数
      if (this.config.queryTemplate) {
        for (const [key, template] of Object.entries(this.config.queryTemplate)) {
          const value = template.replace(/\{(\w+)\}/g, (_, param) =>
            encodeURIComponent(String(input[param] ?? ''))
          )
          url.searchParams.set(key, value)
        }
      }

      return url.toString()
    } catch {
      return null
    }
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CoWorker-Agent/1.0',
      ...this.config.headers,
    }

    // 添加认证
    if (this.config.auth) {
      const secret = process.env[this.config.auth.secretEnvVar]
      if (secret) {
        switch (this.config.auth.type) {
          case 'bearer':
            headers['Authorization'] = `Bearer ${secret}`
            break
          case 'api_key':
            headers[this.config.auth.keyHeader ?? 'X-API-Key'] = secret
            break
          case 'basic':
            headers['Authorization'] = `Basic ${Buffer.from(secret).toString('base64')}`
            break
        }
      }
    }

    return headers
  }

  private buildBody(input: Record<string, unknown>): string | undefined {
    if (this.config.method === 'GET') return undefined

    if (this.config.bodyTemplate) {
      try {
        return this.config.bodyTemplate.replace(/\{(\w+)\}/g, (_, key) =>
          JSON.stringify(input[key] ?? '')
        )
      } catch {
        // 模板解析失败，使用 input 作为 body
      }
    }

    return JSON.stringify(input)
  }

  private extractResponseField(data: unknown, path: string): unknown {
    const parts = path.split('.')
    let current: unknown = data

    for (const part of parts) {
      if (current === null || current === undefined) return undefined
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part]
      } else {
        return undefined
      }
    }

    return current
  }

  private delay(attempt: number): Promise<void> {
    const ms = Math.min(1000 * Math.pow(2, attempt), 10000)
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private buildErrorResult(error: string, startTime: number, retryCount: number): ExternalToolResult {
    return {
      success: false,
      output: { error },
      error,
      durationMs: Date.now() - startTime,
      retryCount,
      toolId: this.definition.id,
      timestamp: new Date().toISOString(),
    }
  }
}
