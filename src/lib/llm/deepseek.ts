/**
 * DeepSeek LLM Provider
 *
 * 调用 DeepSeek 原生 API（OpenAI 兼容格式），支持流式响应和 Tool Use
 *
 * 环境变量：
 * - DEEPSEEK_API_KEY: API Key（必填）
 * - DEEPSEEK_BASE_URL: API 基础 URL（可选，默认 https://api.deepseek.com）
 * - DEEPSEEK_MODEL: 模型名称（可选，默认 deepseek-chat）
 * - DEEPSEEK_MAX_TOKENS: 最大输出 token 数（可选，默认 4096）
 * - DEEPSEEK_RETRY_COUNT: 重试次数（可选，默认 2）
 * - DEEPSEEK_RETRY_DELAY_MS: 重试基础延迟毫秒数（可选，默认 1000）
 */

import type { LLMProvider, ChatMessage, StreamEvent, LLMToolDefinition, LLMChatResult } from './types'

/** 默认模型 */
const DEFAULT_MODEL = 'deepseek-chat'
/** 默认最大 token 数 */
const DEFAULT_MAX_TOKENS = 4096
/** 默认重试次数 */
const DEFAULT_RETRY_COUNT = 2
/** 默认重试基础延迟（毫秒） */
const DEFAULT_RETRY_DELAY_MS = 1000

export class DeepSeekLLMProvider implements LLMProvider {
  name = 'deepseek'
  private apiKey: string
  private baseURL: string
  private model: string
  private maxTokens: number
  private retryCount: number
  private retryDelayMs: number
  private useAnthropicFormat: boolean

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY
    if (!apiKey) {
      throw new Error(
        'DEEPSEEK_API_KEY is required for DeepSeek provider. ' +
          'Get your key at https://platform.deepseek.com/ ' +
          'and set it in .env: DEEPSEEK_API_KEY=sk-...'
      )
    }

    this.apiKey = apiKey
    this.baseURL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '')
    this.model = process.env.DEEPSEEK_MODEL || DEFAULT_MODEL
    this.maxTokens = parseInt(process.env.DEEPSEEK_MAX_TOKENS || '', 10) || DEFAULT_MAX_TOKENS
    this.retryCount = parseInt(process.env.DEEPSEEK_RETRY_COUNT || '', 10) || DEFAULT_RETRY_COUNT
    this.retryDelayMs = parseInt(process.env.DEEPSEEK_RETRY_DELAY_MS || '', 10) || DEFAULT_RETRY_DELAY_MS

    // 检测是否使用 Anthropic 格式
    this.useAnthropicFormat = this.baseURL.includes('/anthropic')

    // 仅在开发环境打印初始化信息
    if (process.env.NODE_ENV === 'development') {
      console.log(`[LLM] DeepSeek provider initialized: model=${this.model}`)
    }
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    isStream = false
  ): Promise<Response> {
    void isStream

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const response = await fetch(url, options)

        // 429 速率限制 - 重试
        if (response.status === 429 && attempt < this.retryCount) {
          const retryAfter = response.headers.get('Retry-After')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60000)
            : this.retryDelayMs * Math.pow(2, attempt)

          console.warn(`[LLM] Rate limited (429), retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.retryCount})`)
          await sleep(delayMs)
          continue
        }

        // 5xx 服务端错误 - 重试
        if (response.status >= 500 && attempt < this.retryCount) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt)
          console.warn(`[LLM] Server error (${response.status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.retryCount})`)
          await sleep(delayMs)
          continue
        }

        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.retryCount) {
          const delayMs = this.retryDelayMs * Math.pow(2, attempt)
          console.warn(`[LLM] Network error, retrying in ${delayMs}ms (attempt ${attempt + 1}/${this.retryCount}): ${lastError.message}`)
          await sleep(delayMs)
        }
      }
    }

    throw lastError || new Error('Failed after retries')
  }

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    if (this.useAnthropicFormat) {
      yield* this.streamChatAnthropic(messages, systemPrompt)
    } else {
      yield* this.streamChatOpenAI(messages, systemPrompt)
    }
  }

  private async *streamChatAnthropic(
    messages: ChatMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const apiMessages = this.buildAnthropicMessages(messages)

    yield { type: 'start' }

    try {
      const requestBody: Record<string, unknown> = {
        model: this.model,
        messages: apiMessages,
        max_tokens: this.maxTokens,
        stream: true,
      }

      if (systemPrompt && systemPrompt.trim()) {
        requestBody.system = systemPrompt
      }

      const response = await this.fetchWithRetry(
        `${this.baseURL}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(requestBody),
        },
        true
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (!trimmed.startsWith('data: ')) continue

            try {
              const json = JSON.parse(trimmed.slice(6))
              // Anthropic 流式响应格式
              if (json.type === 'content_block_delta' && json.delta?.text) {
                yield { type: 'delta', content: json.delta.text }
              }
            } catch {
              // 忽略解析错误的行
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      yield { type: 'done' }
    } catch (error) {
      const errorMessage = formatDeepSeekError(error)
      yield { type: 'error', error: errorMessage }
      yield { type: 'done' }
    }
  }

  private async *streamChatOpenAI(
    messages: ChatMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const apiMessages = this.buildApiMessages(messages, systemPrompt)

    yield { type: 'start' }

    try {
      const response = await this.fetchWithRetry(
        `${this.baseURL}/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            messages: apiMessages,
            max_tokens: this.maxTokens,
            stream: true,
          }),
        },
        true
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || trimmed === 'data: [DONE]') continue
            if (!trimmed.startsWith('data: ')) continue

            try {
              const json = JSON.parse(trimmed.slice(6))
              const delta = json.choices?.[0]?.delta
              if (delta?.content) {
                yield { type: 'delta', content: delta.content }
              }
            } catch {
              // 忽略解析错误的行
            }
          }
        }
      } finally {
        reader.releaseLock()
      }

      yield { type: 'done' }
    } catch (error) {
      const errorMessage = formatDeepSeekError(error)
      yield { type: 'error', error: errorMessage }
      yield { type: 'done' }
    }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { tools?: LLMToolDefinition[]; maxTokens?: number }
  ): Promise<LLMChatResult> {
    if (this.useAnthropicFormat) {
      return this.chatAnthropic(messages, systemPrompt, options)
    }
    return this.chatOpenAI(messages, systemPrompt, options)
  }

  private async chatAnthropic(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { tools?: LLMToolDefinition[]; maxTokens?: number }
  ): Promise<LLMChatResult> {
    const apiMessages = this.buildAnthropicMessages(messages)

    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: apiMessages,
      max_tokens: options?.maxTokens ?? this.maxTokens,
    }

    if (systemPrompt && systemPrompt.trim()) {
      requestBody.system = systemPrompt
    }

    // 转换工具格式为 Anthropic 格式
    if (options?.tools && options.tools.length > 0) {
      requestBody.tools = options.tools.map((t) => ({
        name: sanitizeToolName(t.name),
        description: t.description,
        input_schema: t.input_schema,
      }))
    }

    const response = await this.fetchWithRetry(
      `${this.baseURL}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
    }

    const json = (await response.json()) as {
      content: Array<{
        type: string
        text?: string
        name?: string
        input?: Record<string, unknown>
      }>
      stop_reason: string
    }

    // 仅在开发环境打印调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('[DeepSeek Anthropic] stop_reason:', json.stop_reason)
    }

    let content = ''
    let toolUse: LLMChatResult['toolUse'] | undefined

    // 处理响应内容
    for (const block of json.content || []) {
      if (block.type === 'text') {
        content += block.text || ''
      } else if (block.type === 'tool_use') {
        toolUse = {
          name: unsanitizeToolName(block.name || ''),
          input: block.input || {},
        }
      }
    }

    const stopReason = this.mapAnthropicStopReason(json.stop_reason)

    return { content, toolUse, stopReason }
  }

  private async chatOpenAI(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { tools?: LLMToolDefinition[]; maxTokens?: number }
  ): Promise<LLMChatResult> {
    const apiMessages = this.buildApiMessages(messages, systemPrompt)

    const requestBody: Record<string, unknown> = {
      model: this.model,
      messages: apiMessages,
      max_tokens: options?.maxTokens ?? this.maxTokens,
      stream: false,
    }

    // 转换工具格式
    if (options?.tools && options.tools.length > 0) {
      requestBody.tools = options.tools.map((t) => ({
        type: 'function',
        function: {
          name: sanitizeToolName(t.name),
          description: t.description,
          parameters: t.input_schema,
        },
      }))
    }

    const response = await this.fetchWithRetry(
      `${this.baseURL}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`DeepSeek API error (${response.status}): ${errorText}`)
    }

    const json = (await response.json()) as {
      choices: Array<{
        message: {
          role: string
          content?: string
          tool_calls?: Array<{
            function: {
              name: string
              arguments: string
            }
          }>
        }
        finish_reason: string
      }>
    }

    const choice = json.choices?.[0]
    if (!choice) {
      throw new Error('Empty response from DeepSeek API')
    }

    // 仅在开发环境打印调试信息
    if (process.env.NODE_ENV === 'development') {
      console.log('[DeepSeek OpenAI] finish_reason:', choice.finish_reason)
    }

    let content = ''
    let toolUse: LLMChatResult['toolUse'] | undefined

    // 处理工具调用
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0]
      try {
        toolUse = {
          name: unsanitizeToolName(toolCall.function.name),
          input: JSON.parse(toolCall.function.arguments),
        }
      } catch {
        toolUse = {
          name: unsanitizeToolName(toolCall.function.name),
          input: { raw: toolCall.function.arguments },
        }
      }
      content = choice.message.content || ''
    } else {
      content = choice.message.content || ''
    }

    const stopReason = this.mapFinishReason(choice.finish_reason)

    return { content, toolUse, stopReason }
  }

  /**
   * 构建 OpenAI 格式的 messages，将 systemPrompt 合并进去
   */
  private buildApiMessages(messages: ChatMessage[], systemPrompt: string): Array<{ role: string; content: string }> {
    const apiMessages: Array<{ role: string; content: string }> = []

    if (systemPrompt && systemPrompt.trim()) {
      apiMessages.push({ role: 'system', content: systemPrompt })
    }

    for (const msg of messages) {
      if (msg.role === 'system') continue
      apiMessages.push({ role: msg.role, content: msg.content })
    }

    return apiMessages
  }

  /**
   * 构建 Anthropic 格式的 messages
   */
  private buildAnthropicMessages(messages: ChatMessage[]): Array<{ role: string; content: string }> {
    const apiMessages: Array<{ role: string; content: string }> = []

    for (const msg of messages) {
      if (msg.role === 'system') continue
      // Anthropic 只支持 user 和 assistant 角色
      const role = msg.role === 'assistant' ? 'assistant' : 'user'
      apiMessages.push({ role, content: msg.content })
    }

    return apiMessages
  }

  /**
   * 映射 OpenAI finish_reason 到内部格式
   */
  private mapFinishReason(reason: string): LLMChatResult['stopReason'] {
    switch (reason) {
      case 'stop':
        return 'end_turn'
      case 'length':
        return 'max_tokens'
      case 'tool_calls':
        return 'tool_use'
      default:
        return 'end_turn'
    }
  }

  /**
   * 映射 Anthropic stop_reason 到内部格式
   */
  private mapAnthropicStopReason(reason: string): LLMChatResult['stopReason'] {
    switch (reason) {
      case 'end_turn':
        return 'end_turn'
      case 'max_tokens':
        return 'max_tokens'
      case 'tool_use':
        return 'tool_use'
      default:
        return 'end_turn'
    }
  }
}

/**
 * 格式化 DeepSeek API 错误信息
 */
function formatDeepSeekError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return 'DeepSeek API 认证失败：DEEPSEEK_API_KEY 无效或已过期。请检查 .env 中的 DEEPSEEK_API_KEY。'
    }
    if (error.message.includes('429')) {
      return 'DeepSeek API 请求频率超限。请稍后重试。'
    }
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return 'DeepSeek API 服务暂时不可用，请稍后重试。'
    }
    return error.message
  }
  return 'Unknown error from DeepSeek API'
}

/** 延迟函数 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 清理工具名称，确保符合 API 要求
 *
 * DeepSeek API 要求工具名匹配 ^[a-zA-Z0-9_-]+$
 * 我们的工具名包含 .（如 read.project_context），需要替换为 _
 */
function sanitizeToolName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_')
}

/**
 * 还原工具名称（反向映射）
 *
 * 将 API 返回的清理后名称映射回原始名称
 */
const TOOL_NAME_REVERSE_MAP: Record<string, string> = {}

function unsanitizeToolName(sanitized: string): string {
  // 如果有反向映射，使用它
  if (TOOL_NAME_REVERSE_MAP[sanitized]) {
    return TOOL_NAME_REVERSE_MAP[sanitized]
  }
  // 否则返回原始名称（可能已经是原始名称）
  return sanitized
}

/**
 * 注册工具名称映射
 */
export function registerToolNameMapping(original: string, sanitized: string): void {
  TOOL_NAME_REVERSE_MAP[sanitized] = original
}
