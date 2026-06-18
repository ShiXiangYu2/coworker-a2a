/**
 * Claude LLM Provider
 *
 * 调用 Anthropic Claude API，支持流式响应和 Tool Use
 *
 * 环境变量：
 * - ANTHROPIC_API_KEY: API Key（必填）
 * - ANTHROPIC_BASE_URL: API 基础 URL（可选，默认 https://api.anthropic.com）
 * - CLAUDE_MODEL: 模型名称（可选，默认 claude-sonnet-4-20250514）
 * - CLAUDE_MAX_TOKENS: 最大输出 token 数（可选，默认 4096）
 */

import Anthropic from '@anthropic-ai/sdk'
import type { LLMProvider, ChatMessage, StreamEvent, LLMToolDefinition, LLMChatResult } from './types'

/** 默认模型 */
const DEFAULT_MODEL = 'claude-sonnet-4-20250514'
/** 默认最大 token 数 */
const DEFAULT_MAX_TOKENS = 4096

export class ClaudeLLMProvider implements LLMProvider {
  name = 'claude'
  private client: Anthropic
  private model: string
  private maxTokens: number

  constructor() {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error(
        'CLAUDE_API_KEY is required for Claude provider. ' +
          'Get your key at https://console.anthropic.com/ ' +
          'and set it in .env: CLAUDE_API_KEY=sk-ant-...'
      )
    }

    const baseURL = process.env.CLAUDE_BASE_URL || process.env.ANTHROPIC_BASE_URL || undefined

    // Override system env vars to prevent them from interfering with our config
    process.env.ANTHROPIC_API_KEY = apiKey
    if (baseURL) {
      process.env.ANTHROPIC_BASE_URL = baseURL
    }
    // Clear ANTHROPIC_AUTH_TOKEN if it exists (system env may set this for Claude Code CLI)
    delete process.env.ANTHROPIC_AUTH_TOKEN

    this.client = new Anthropic({ apiKey, baseURL })
    this.model = process.env.CLAUDE_MODEL || DEFAULT_MODEL
    this.maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '', 10) || DEFAULT_MAX_TOKENS

    console.log(`[LLM] Claude provider initialized: model=${this.model}, maxTokens=${this.maxTokens}${baseURL ? `, baseURL=${baseURL}` : ''}`)
  }

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    // 转换消息格式为 Claude API 格式
    const claudeMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    // 发送 start 事件
    yield { type: 'start' }

    try {
      // 调用 Claude API 流式响应
      const stream = this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        system: systemPrompt,
        messages: claudeMessages,
      })

      // 处理流式响应
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          yield { type: 'delta', content: event.delta.text }
        }
      }

      // 发送 done 事件
      yield { type: 'done' }
    } catch (error) {
      const errorMessage = formatClaudeError(error)
      yield { type: 'error', error: errorMessage }
      yield { type: 'done' }
    }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { tools?: LLMToolDefinition[]; maxTokens?: number }
  ): Promise<LLMChatResult> {
    const claudeMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

    const params: Anthropic.MessageCreateParams = {
      model: this.model,
      max_tokens: options?.maxTokens ?? this.maxTokens,
      system: systemPrompt,
      messages: claudeMessages,
    }

    if (options?.tools && options.tools.length > 0) {
      params.tools = options.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema as Anthropic.Tool['input_schema'],
      }))
    }

    const response = await this.client.messages.create(params)

    let content = ''
    let toolUse: LLMChatResult['toolUse'] | undefined

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text
      } else if (block.type === 'tool_use') {
        toolUse = { name: block.name, input: block.input as Record<string, unknown> }
      }
    }

    return {
      content,
      toolUse,
      stopReason: response.stop_reason as LLMChatResult['stopReason'],
    }
  }
}

/**
 * 格式化 Claude API 错误信息
 */
function formatClaudeError(error: unknown): string {
  if (error instanceof Error) {
    // 按错误名称匹配（兼容 mock 环境）
    switch (error.name) {
      case 'AuthenticationError':
        return 'Claude API 认证失败：ANTHROPIC_API_KEY 无效或已过期。请检查 .env 中的 ANTHROPIC_API_KEY。'
      case 'RateLimitError':
        return 'Claude API 请求频率超限。请稍后重试。'
      case 'APIError': {
        const status = (error as { status?: number }).status
        return `Claude API 错误 (${status ?? 'unknown'}): ${error.message}`
      }
      default:
        return error.message
    }
  }
  return 'Unknown error from Claude API'
}
