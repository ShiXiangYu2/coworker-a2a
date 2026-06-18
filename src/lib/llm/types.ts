/**
 * LLM Provider 类型定义
 */

/** 流式响应事件 */
export type StreamEvent =
  | { type: 'start'; messageId?: string; conversationId?: string }
  | { type: 'delta'; content: string }
  | { type: 'done'; messageId?: string }
  | { type: 'error'; error: string }

/** 消息 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/** LLM Tool 定义（用于 Tool Use 结构化输出） */
export interface LLMToolDefinition {
  name: string
  description: string
  input_schema: Record<string, unknown>
}

/** LLM Tool Use 结果 */
export interface LLMToolUse {
  name: string
  input: Record<string, unknown>
}

/** LLM 非流式对话结果 */
export interface LLMChatResult {
  content: string
  toolUse?: LLMToolUse
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens'
}

/** LLM Provider 接口 */
export interface LLMProvider {
  name: string

  /**
   * 流式对话
   * @param messages 对话历史
   * @param systemPrompt System Prompt
   * @returns 流式事件的异步迭代器
   */
  streamChat(
    messages: ChatMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamEvent, void, unknown>

  /**
   * 非流式对话（支持 Tool Use 结构化输出）
   * @param messages 对话历史
   * @param systemPrompt System Prompt
   * @param options 可选工具列表和 maxTokens
   * @returns 包含文本和/或 Tool Use 的结果
   */
  chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { tools?: LLMToolDefinition[]; maxTokens?: number }
  ): Promise<LLMChatResult>
}
