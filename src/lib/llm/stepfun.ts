/**
 * StepFun (阶跃星辰) LLM Provider
 *
 * 调用 StepFun API（OpenAI 兼容格式），支持流式响应和 Tool Use
 *
 * 环境变量：
 * - STEPFUN_API_KEY: API Key（必填）
 * - STEPFUN_BASE_URL: API 基础 URL（可选，默认 https://api.stepfun.com）
 * - STEPFUN_MODEL: 模型名称（可选，默认 step-3.7-flash）
 * - STEPFUN_MAX_TOKENS: 最大输出 token 数（可选，默认 4096）
 * - STEPFUN_RETRY_COUNT: 重试次数（可选，默认 2）
 * - STEPFUN_RETRY_DELAY_MS: 重试基础延迟毫秒数（可选，默认 1000）
 */

import type { LLMProvider, ChatMessage, StreamEvent, LLMToolDefinition, LLMChatResult } from './types'

/** 默认模型 */
const DEFAULT_MODEL = 'step-3.7-flash'
/** 默认最大 token 数 */
const DEFAULT_MAX_TOKENS = 4096
/** 默认重试次数 */
const DEFAULT_RETRY_COUNT = 2
/** 默认重试基础延迟（毫秒） */
const DEFAULT_RETRY_DELAY_MS = 1000

export class StepFunLLMProvider implements LLMProvider {
  name = 'stepfun'
  private apiKey: string
  private baseURL: string
  private model: string
  private maxTokens: number
  private retryCount: number
  private retryDelayMs: number

  constructor() {
    this.apiKey = process.env.STEPFUN_API_KEY || ''
    if (!this.apiKey) {
      throw new Error(
        'STEPFUN_API_KEY is required for StepFun provider. ' +
          'Get your key at https://platform.stepfun.com/ ' +
          'and set it in .env: STEPFUN_API_KEY=...'
      )
    }

    this.baseURL = (process.env.STEPFUN_BASE_URL || 'https://api.stepfun.com').replace(/\/$/, '')
    this.model = process.env.STEPFUN_MODEL || DEFAULT_MODEL
    this.maxTokens = parseInt(process.env.STEPFUN_MAX_TOKENS || '', 10) || DEFAULT_MAX_TOKENS
    this.retryCount = parseInt(process.env.STEPFUN_RETRY_COUNT || '', 10) || DEFAULT_RETRY_COUNT
    this.retryDelayMs = parseInt(process.env.STEPFUN_RETRY_DELAY_MS || '', 10) || DEFAULT_RETRY_DELAY_MS

    console.log(`[LLM] StepFun provider initialized: model=${this.model}, maxTokens=${this.maxTokens}, baseURL=${this.baseURL}, retry=${this.retryCount}`)
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    _isStream = false
  ): Promise<Response> {
    void _isStream

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const response = await fetch(url, options)

        // 429 速率限制 - 重试
        if (response.status === 429 && attempt < this.retryCount) {
          const retryAfter = response.headers.get('Retry-After')
          const delayMs = retryAfter
            ? Math.min(parseInt(retryAfter, 10) * 1000, 60000)
            : this.retryDelayMs * Math.pow(2, attempt) // 指数退避

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
        // 网络错误也重试
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
        true // isStream
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`StepFun API error (${response.status}): ${errorText}`)
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
      const errorMessage = formatStepFunError(error)
      yield { type: 'error', error: errorMessage }
      yield { type: 'done' }
    }
  }

  async chat(
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
          name: t.name,
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
      throw new Error(`StepFun API error (${response.status}): ${errorText}`)
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
      throw new Error('Empty response from StepFun API')
    }

    let content = ''
    let toolUse: LLMChatResult['toolUse'] | undefined

    // 处理工具调用
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const toolCall = choice.message.tool_calls[0]
      try {
        toolUse = {
          name: toolCall.function.name,
          input: JSON.parse(toolCall.function.arguments),
        }
      } catch {
        toolUse = {
          name: toolCall.function.name,
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

    // 如果有 system prompt，添加为 system 消息
    if (systemPrompt && systemPrompt.trim()) {
      apiMessages.push({ role: 'system', content: systemPrompt })
    }

    // 添加对话历史（过滤掉内部的 system 消息，因为已经合并了）
    for (const msg of messages) {
      if (msg.role === 'system') continue // 跳过，已经合并到 systemPrompt 中
      apiMessages.push({ role: msg.role, content: msg.content })
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
}

/**
 * 格式化 StepFun API 错误信息
 */
function formatStepFunError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      return 'StepFun API 认证失败：STEPFUN_API_KEY 无效或已过期。请检查 .env 中的 STEPFUN_API_KEY。'
    }
    if (error.message.includes('429')) {
      return 'StepFun API 请求频率超限。请稍后重试。'
    }
    if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
      return 'StepFun API 服务暂时不可用，请稍后重试。'
    }
    return error.message
  }
  return 'Unknown error from StepFun API'
}

/** 延迟函数 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
