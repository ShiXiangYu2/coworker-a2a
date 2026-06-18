/**
 * System Prompt 配置
 */

const DEFAULT_SYSTEM_PROMPT = `你是 CoWorker+A2A 生产系统的 AI 助手。你正在与用户对话，帮助他们完成工作任务。

请用中文回复，保持专业、简洁。当用户提供具体任务时，给出清晰、可执行的建议。`

/**
 * 获取 System Prompt
 *
 * 优先使用环境变量 SYSTEM_PROMPT，否则使用默认值
 */
export function getSystemPrompt(): string {
  return process.env.SYSTEM_PROMPT || DEFAULT_SYSTEM_PROMPT
}
