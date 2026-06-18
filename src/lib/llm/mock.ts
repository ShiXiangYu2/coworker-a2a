/**
 * Mock LLM Provider
 *
 * 本地开发用，返回模拟流式响应，无需 API Key
 */

import type { LLMProvider, ChatMessage, StreamEvent, LLMToolDefinition, LLMChatResult } from './types'

/** 模拟回复内容 */
const MOCK_RESPONSES = [
  '你好！我是 CoWorker+A2A 的 AI 助手。目前处于 Mock 模式，返回的是模拟回复。\n\n要使用真实 Claude API，请在 `.env` 中设置：\n```\nLLM_PROVIDER=claude\nANTHROPIC_API_KEY=your-key\n```',
  '这是一个 Mock 回复。在生产环境中，这里会是 Claude 的真实回答。\n\n当前支持的功能：\n- ✅ 流式响应\n- ✅ Markdown 渲染\n- ✅ 对话历史持久化\n- ⏳ Agent 路由（Sprint 2）',
  '收到你的消息了！Mock Provider 正在工作。\n\n```javascript\nconst mock = new MockProvider()\nconsole.log(mock.name) // "mock"\n```\n\n以上是代码示例，展示 Markdown 渲染效果。',
]

export class MockLLMProvider implements LLMProvider {
  name = 'mock'

  async *streamChat(
    messages: ChatMessage[],
    systemPrompt: string
  ): AsyncGenerator<StreamEvent, void, unknown> {
    void systemPrompt

    // 发送 start 事件
    yield { type: 'start' }

    // 选择一个模拟回复
    const lastMessage = messages[messages.length - 1]
    const responseIndex = lastMessage?.content.length
      ? lastMessage.content.length % MOCK_RESPONSES.length
      : 0
    const response = MOCK_RESPONSES[responseIndex]

    // 逐字输出（模拟流式）
    const chunks = response.split('')
    for (const chunk of chunks) {
      // 模拟网络延迟（10-30ms）
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 10))
      yield { type: 'delta', content: chunk }
    }

    // 发送 done 事件
    yield { type: 'done' }
  }

  async chat(
    messages: ChatMessage[],
    systemPrompt: string,
    options?: { tools?: LLMToolDefinition[]; maxTokens?: number }
  ): Promise<LLMChatResult> {
    void systemPrompt
    void options

    const lastMessage = messages[messages.length - 1]
    const text = lastMessage?.content
      ? `Mock chat response for: "${lastMessage.content.slice(0, 50)}"`
      : 'Mock chat response'

    // If tools are provided, return a mock tool use for the first tool
    if (options?.tools && options.tools.length > 0) {
      const tool = options.tools[0]
      const mockInput: Record<string, unknown> = {}
      const schema = tool.input_schema as {
        properties?: Record<string, { type?: string; enum?: string[] }>
        required?: string[]
      }
      if (schema?.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          if (prop.enum && prop.enum.length > 0) {
            // Use first enum value as default
            mockInput[key] = prop.enum[0]
          } else if (prop.type === 'string') {
            mockInput[key] = `mock-${key}`
          } else if (prop.type === 'number') {
            mockInput[key] = 0.85
          } else if (prop.type === 'boolean') {
            mockInput[key] = true
          } else if (prop.type === 'array') {
            mockInput[key] = []
          } else if (prop.type === 'object') {
            mockInput[key] = {}
          }
        }
      }
      return {
        content: text,
        toolUse: { name: tool.name, input: mockInput },
        stopReason: 'tool_use',
      }
    }

    return { content: text, stopReason: 'end_turn' }
  }
}
