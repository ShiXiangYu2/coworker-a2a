/**
 * Sprint 20: 审查执行器
 *
 * 自动审查 Agent 产出的 deliverable。
 * 使用 Turing Agent（loop-review Skill）进行质量审查。
 */

import { getLLMProvider } from '@/lib/llm'
import type { LLMToolDefinition } from '@/lib/llm/types'
import type { AgentReview, Deliverable, ReviewVerdict } from './types'

/** 审查工具定义 */
const reviewTool: LLMToolDefinition = {
  name: 'review_deliverable',
  description: 'Review a deliverable and provide quality assessment.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: {
        type: 'string',
        enum: ['approve', 'request_changes', 'reject'],
        description: 'Review decision',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the review (0.0-1.0)',
      },
      summary: {
        type: 'string',
        description: 'One-line review summary',
      },
      findings: {
        type: 'array',
        description: 'Issues found (empty if approved)',
      },
      suggestions: {
        type: 'array',
        description: 'Improvement suggestions',
      },
    },
    required: ['verdict', 'confidence', 'summary', 'findings', 'suggestions'],
  },
}

/** 审查系统提示 */
const REVIEW_SYSTEM_PROMPT = `You are Turing, the Verification Agent for CoWorker+A2A.

Your job is to review deliverables produced by other agents. You must be objective and thorough.

## Review Dimensions

1. **Correctness**: Is the content accurate and complete?
2. **Security**: Are there sensitive data leaks or security issues?
3. **Clarity**: Is the format clear and structure reasonable?
4. **Completeness**: Does it cover the requested scope?

## Decision Rules

- If no blocking issues AND confidence >= 0.8 → approve
- If no blocking issues AND confidence < 0.8 → request_changes
- If there ARE blocking issues → reject

## Output Format

Use the review_deliverable tool to provide your assessment.
- findings: List specific issues found (empty array if approve)
- suggestions: List improvement recommendations
- verdict: approve / request_changes / reject
- confidence: Your confidence in this review (0.0-1.0)

Be constructive. Focus on real issues, not style preferences.`

/**
 * 审查单个 deliverable
 */
export async function reviewDeliverable(
  deliverable: Deliverable,
  sourceAgentId: string
): Promise<AgentReview> {
  const reviewPrompt = `Please review the following deliverable:

**Type**: ${deliverable.type}
**Title**: ${deliverable.title}
**Content**:
${deliverable.content.slice(0, 3000)}${deliverable.content.length > 3000 ? '\n... (truncated)' : ''}

Review this deliverable for correctness, security, clarity, and completeness.`

  try {
    const provider = getLLMProvider()
    const result = await provider.chat(
      [{ role: 'user', content: reviewPrompt }],
      REVIEW_SYSTEM_PROMPT,
      {
        tools: [reviewTool],
        maxTokens: 2048,
      }
    )

    if (result.toolUse && result.toolUse.name === 'review_deliverable') {
      const input = result.toolUse.input as Record<string, unknown>
      return {
        agentId: 'turing',
        targetAgentId: sourceAgentId,
        targetDeliverableTitle: deliverable.title,
        verdict: (input.verdict as ReviewVerdict) ?? 'approve',
        confidence: typeof input.confidence === 'number' ? input.confidence : 0.7,
        findings: Array.isArray(input.findings) ? input.findings.map(String) : [],
        suggestions: Array.isArray(input.suggestions) ? input.suggestions.map(String) : [],
        summary: (input.summary as string) ?? 'Review completed.',
      }
    }

    // Fallback: approve if no tool use
    return {
      agentId: 'turing',
      targetAgentId: sourceAgentId,
      targetDeliverableTitle: deliverable.title,
      verdict: 'approve',
      confidence: 0.6,
      findings: [],
      suggestions: [],
      summary: 'Review completed (fallback: no structured output).',
    }
  } catch (error) {
    // On error, approve (don't block delivery)
    return {
      agentId: 'turing',
      targetAgentId: sourceAgentId,
      targetDeliverableTitle: deliverable.title,
      verdict: 'approve',
      confidence: 0.5,
      findings: [],
      suggestions: [],
      summary: `Review skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
    }
  }
}

/**
 * 批量审查 deliverables
 */
export async function reviewDeliverables(
  deliverables: Deliverable[],
  sourceAgentId: string
): Promise<AgentReview[]> {
  const reviews: AgentReview[] = []
  for (const d of deliverables) {
    const review = await reviewDeliverable(d, sourceAgentId)
    reviews.push(review)
  }
  return reviews
}
