/**
 * 结果汇总器
 *
 * 将多个 Agent 的子任务结果汇总为一份完整的报告。
 */

import { getLLMProvider } from '@/lib/llm'
import type { SubTaskResult } from './task-executor'

/**
 * 汇总所有子任务结果
 *
 * @param originalMessage 用户原始消息
 * @param subtaskResults 所有子任务的执行结果
 * @returns Markdown 格式的汇总报告
 */
export async function summarizeResults(
  originalMessage: string,
  subtaskResults: SubTaskResult[]
): Promise<string> {
  // 构建上下文
  const contextParts: string[] = [
    `## User Request`,
    originalMessage,
    '',
    `## Agent Analysis Results`,
  ]

  for (const result of subtaskResults) {
    contextParts.push('')
    contextParts.push(`### ${result.agentName} (${result.agentId}) — ${result.title}`)
    contextParts.push(`- Status: ${result.status}`)
    contextParts.push(`- Confidence: ${(result.confidence * 100).toFixed(0)}%`)
    contextParts.push(`- Summary: ${result.summary}`)
    if (result.findings.length > 0) {
      contextParts.push(`- Findings:`)
      for (const finding of result.findings) {
        contextParts.push(`  - ${finding}`)
      }
    }
    if (result.error) {
      contextParts.push(`- Note: ${result.error}`)
    }
  }

  const userMessage = contextParts.join('\n')

  const systemPrompt = `You are the CEO Agent (Elon) of CoWorker. Your team of specialist agents has completed their analysis tasks. Your job is to synthesize their results into a clear, actionable report for the user.

## Rules
1. Summarize ALL agent results — don't skip any
2. Highlight key findings from each agent
3. Identify areas of agreement and disagreement between agents
4. Provide clear next-step recommendations
5. Use Markdown formatting for readability
6. Write in Chinese (the user's language)
7. Be concise but thorough

## Output Format
Write a structured report with:
- 执行摘要（一句话总结）
- 各 Agent 分析结果
- 关键发现
- 建议下一步`

  try {
    const provider = getLLMProvider()
    const result = await provider.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { maxTokens: 4096 }
    )

    return result.content || buildFallbackSummary(subtaskResults)
  } catch {
    // On LLM failure, build a simple summary
    return buildFallbackSummary(subtaskResults)
  }
}

/**
 * LLM 失败时的降级汇总
 */
function buildFallbackSummary(results: SubTaskResult[]): string {
  const parts: string[] = ['# Agent 协作分析报告', '']

  for (const result of results) {
    parts.push(`## ${result.agentName} (${result.agentId})`)
    parts.push('')
    parts.push(`**${result.title}**`)
    parts.push('')
    parts.push(`- 状态: ${result.status}`)
    parts.push(`- 置信度: ${(result.confidence * 100).toFixed(0)}%`)
    parts.push(`- 摘要: ${result.summary}`)
    parts.push('')
    if (result.findings.length > 0) {
      parts.push('**发现:**')
      for (const f of result.findings) {
        parts.push(`- ${f}`)
      }
      parts.push('')
    }
  }

  parts.push('---')
  parts.push(`*报告由 ${results.length} 个 Agent 协作生成*`)

  return parts.join('\n')
}
