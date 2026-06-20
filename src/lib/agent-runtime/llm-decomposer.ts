/**
 * LLM Task Decomposer — 基于 LLM 的任务分解
 *
 * 使用 Elon Agent（CEO）通过 LLM 分析复杂任务，生成结构化的子任务分解。
 * 替代原有的硬编码规则分解，支持更灵活的任务理解。
 *
 * 核心流程：
 *   1. 构建分解 prompt（含任务信息 + Agent 能力描述）
 *   2. 调用 LLM 产出 JSON 分解结果
 *   3. 解析为 SubtaskDefinition[]
 *   4. 校验依赖关系和 Agent ID 有效性
 *
 * 安全：
 *   - 只分配给已注册的 Agent
 *   - 依赖索引必须有效
 *   - 最多 8 个子任务（防止过度分解）
 */

import { getLLMProvider } from '@/lib/llm'
import type { AgentId } from '@/lib/agents/types'
import { getAgents } from '@/lib/agents/registry'
import type { SubtaskDefinition, DecompositionResult } from './subtask-manager'

// ─── 类型 ──────────────────────────────────────────────────────────

interface LLMDecompositionResult {
  reasoning: string
  confidence: number
  subtasks: Array<{
    title: string
    description: string
    targetAgentId: string
    type: string
    dependsOn: number[]
    priority: string
  }>
}

// ─── 分解 Prompt ──────────────────────────────────────────────────

const DECOMPOSITION_PROMPT = `You are Elon, the CEO Agent. Your job is to decompose a complex task into smaller subtasks that can be assigned to specialist agents.

Available agents and their capabilities:
{agentCapabilities}

Rules:
1. Each subtask must be assigned to exactly one agent
2. Subtasks can depend on other subtasks (by index, 0-based)
3. Maximum 8 subtasks
4. Dependencies must form a DAG (no cycles)
5. Each subtask should be independently executable
6. Priority: high/medium/low

Output MUST be a JSON object with this exact structure:
{
  "reasoning": "Why this decomposition makes sense",
  "confidence": 0.0-1.0,
  "subtasks": [
    {
      "title": "Short title",
      "description": "What this subtask does",
      "targetAgentId": "agent_id",
      "type": "product|engineering|verification|customer|coordination",
      "dependsOn": [],
      "priority": "high|medium|low"
    }
  ]
}`

// ─── 核心函数 ──────────────────────────────────────────────────────

/**
 * 使用 LLM 分解任务
 *
 * @param title 任务标题
 * @param description 任务描述
 * @param taskType 任务类型
 * @returns 分解结果（子任务定义列表 + 元信息）
 */
export async function decomposeWithLLM(
  title: string,
  description: string,
  taskType: string,
): Promise<DecompositionResult> {
  try {
    const provider = getLLMProvider()
    const agentCapabilities = buildAgentCapabilitiesPrompt()
    const systemPrompt = DECOMPOSITION_PROMPT.replace('{agentCapabilities}', agentCapabilities)

    const userMessage = [
      `## Task to Decompose`,
      `Title: ${title}`,
      `Description: ${description}`,
      `Type: ${taskType}`,
      '',
      'Decompose this task into subtasks. Output the JSON structure.',
    ].join('\n')

    const result = await provider.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { maxTokens: 4096 },
    )

    // 解析 LLM 输出
    const parsed = parseDecompositionOutput(result.content)
    if (parsed && parsed.subtasks.length > 0) {
      // 校验并规范化
      const validated = validateAndNormalize(parsed, taskType)
      if (validated.subtasks.length > 0) {
        return validated
      }
    }

    // LLM 输出无效，回退到确定性分解
    console.log('[LLM-Decomposer] LLM output invalid, falling back to deterministic decomposition')
    return fallbackDecomposition(title, description, taskType)
  } catch (error) {
    console.error('[LLM-Decomposer] LLM call failed, falling back to deterministic:', error)
    return fallbackDecomposition(title, description, taskType)
  }
}

/**
 * LLM 重规划：分析失败子任务并生成替代方案
 *
 * @param originalSubtasks 原始子任务列表
 * @param failedSubtasks 失败的子任务（含错误信息）
 * @param completedSubtasks 已完成的子任务（含结果摘要）
 * @param parentTitle 父任务标题
 * @param parentDescription 父任务描述
 * @returns 新的子任务定义列表（替代失败的子任务）
 */
export async function replanWithLLM(
  originalSubtasks: Array<{ title: string; description: string; targetAgentId: string; status: string; error?: string; resultSummary?: string }>,
  parentTitle: string,
  parentDescription: string,
): Promise<DecompositionResult> {
  const failed = originalSubtasks.filter((s) => s.status === 'failed')
  const completed = originalSubtasks.filter((s) => s.status === 'completed')

  if (failed.length === 0) {
    return { subtasks: [], reasoning: 'No failed subtasks to replan.', confidence: 1 }
  }

  try {
    const provider = getLLMProvider()
    const agentCapabilities = buildAgentCapabilitiesPrompt()

    const systemPrompt = `You are Elon, the CEO Agent. A task decomposition has partially failed. You need to analyze the failures and propose alternative subtasks.

Available agents:
{agentCapabilities}

Rules:
1. Only propose subtasks for the FAILED work (completed subtasks are done)
2. Learn from failures — don't repeat the same approach
3. Maximum 4 replacement subtasks
4. Consider if a different agent might be better suited
5. Keep dependencies simple

Output MUST be a JSON object:
{
  "reasoning": "Why this replan addresses the failures",
  "confidence": 0.0-1.0,
  "subtasks": [...]
}`.replace('{agentCapabilities}', agentCapabilities)

    const failureReport = failed.map((s) =>
      `- "${s.title}" (assigned to ${s.targetAgentId}): ${s.error ?? 'Unknown error'}`
    ).join('\n')

    const successReport = completed.map((s) =>
      `- "${s.title}" (${s.targetAgentId}): ${s.resultSummary ?? 'Completed'}`
    ).join('\n')

    const userMessage = [
      `## Original Task`,
      `Title: ${parentTitle}`,
      `Description: ${parentDescription}`,
      '',
      `## Completed Subtasks`,
      successReport || '(none)',
      '',
      `## Failed Subtasks`,
      failureReport,
      '',
      'Analyze the failures and propose replacement subtasks. Output JSON.',
    ].join('\n')

    const result = await provider.chat(
      [{ role: 'user', content: userMessage }],
      systemPrompt,
      { maxTokens: 4096 },
    )

    const parsed = parseDecompositionOutput(result.content)
    if (parsed && parsed.subtasks.length > 0) {
      const validated = validateAndNormalize(parsed, 'coordination')
      if (validated.subtasks.length > 0) {
        return validated
      }
    }

    console.log('[LLM-Replanner] LLM output invalid, no replanning possible')
    return { subtasks: [], reasoning: 'LLM replanning produced invalid output.', confidence: 0 }
  } catch (error) {
    console.error('[LLM-Replanner] LLM call failed:', error)
    return { subtasks: [], reasoning: `Replanning failed: ${error}`, confidence: 0 }
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function buildAgentCapabilitiesPrompt(): string {
  const agents = getAgents().filter((a) => !a.isHuman)
  return agents.map((a) =>
    `- ${a.id} (${a.name} — ${a.title}): ${a.responsibilities.join('; ')}`
  ).join('\n')
}

function parseDecompositionOutput(text: string): LLMDecompositionResult | null {
  if (!text) return null

  // 直接解析
  try {
    const parsed = JSON.parse(text)
    if (isValidDecomposition(parsed)) return parsed
  } catch { /* not pure JSON */ }

  // 从 ```json 中提取
  const jsonBlock = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/)
  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock[1])
      if (isValidDecomposition(parsed)) return parsed
    } catch { /* parse failed */ }
  }

  // 从 { ... } 中提取
  const objectMatch = text.match(/\{[\s\S]*"subtasks"[\s\S]*\}/)
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0])
      if (isValidDecomposition(parsed)) return parsed
    } catch { /* parse failed */ }
  }

  return null
}

function isValidDecomposition(obj: Record<string, unknown>): boolean {
  return (
    typeof obj === 'object' && obj !== null &&
    typeof obj.reasoning === 'string' &&
    typeof obj.confidence === 'number' &&
    Array.isArray(obj.subtasks) &&
    obj.subtasks.length > 0 &&
    obj.subtasks.length <= 8
  )
}

const VALID_AGENT_IDS = new Set<string>(['elon', 'jobs', 'linus', 'turing', 'bezos'])
const VALID_TYPES = new Set<string>(['product', 'engineering', 'verification', 'customer', 'coordination'])
const VALID_PRIORITIES = new Set<string>(['high', 'medium', 'low'])

function validateAndNormalize(
  parsed: LLMDecompositionResult,
  fallbackType: string,
): DecompositionResult {
  const validSubtasks: SubtaskDefinition[] = []

  for (const st of parsed.subtasks) {
    // 校验 Agent ID
    if (!VALID_AGENT_IDS.has(st.targetAgentId)) continue

    // 校验类型
    const type = VALID_TYPES.has(st.type) ? st.type : fallbackType

    // 校验优先级
    const priority = VALID_PRIORITIES.has(st.priority) ? st.priority : 'medium'

    // 校验依赖索引
    const dependsOn = Array.isArray(st.dependsOn)
      ? st.dependsOn.filter((d) => typeof d === 'number' && d >= 0 && d < parsed.subtasks.length)
      : []

    validSubtasks.push({
      title: String(st.title).slice(0, 120),
      description: String(st.description).slice(0, 500),
      targetAgentId: st.targetAgentId as AgentId,
      type: type as SubtaskDefinition['type'],
      dependsOn,
      priority: priority as SubtaskDefinition['priority'],
    })
  }

  // 修复依赖索引（基于过滤后的有效子任务）
  for (const st of validSubtasks) {
    st.dependsOn = st.dependsOn.filter((d) => d < validSubtasks.length)
  }

  return {
    subtasks: validSubtasks,
    reasoning: parsed.reasoning,
    confidence: Math.max(0, Math.min(1, parsed.confidence)),
  }
}

/**
 * 确定性回退分解（当 LLM 不可用时）
 */
function fallbackDecomposition(
  title: string,
  description: string,
  taskType: string,
): DecompositionResult {
  const subtasks: SubtaskDefinition[] = []

  if (taskType === 'product') {
    subtasks.push(
      { title: `需求分析: ${title}`, description: `分析需求: ${description}`, targetAgentId: 'jobs', type: 'product', dependsOn: [], priority: 'high' },
      { title: `技术评估: ${title}`, description: `评估技术方案: ${description}`, targetAgentId: 'linus', type: 'engineering', dependsOn: [0], priority: 'medium' },
    )
  } else if (taskType === 'engineering') {
    subtasks.push(
      { title: `架构设计: ${title}`, description: `设计架构: ${description}`, targetAgentId: 'linus', type: 'engineering', dependsOn: [], priority: 'high' },
      { title: `质量验证: ${title}`, description: `验证质量: ${description}`, targetAgentId: 'turing', type: 'verification', dependsOn: [0], priority: 'medium' },
    )
  } else if (taskType === 'verification') {
    subtasks.push(
      { title: `质量检查: ${title}`, description: `检查质量: ${description}`, targetAgentId: 'turing', type: 'verification', dependsOn: [], priority: 'high' },
      { title: `业务评估: ${title}`, description: `评估业务价值: ${description}`, targetAgentId: 'bezos', type: 'customer', dependsOn: [0], priority: 'low' },
    )
  } else if (taskType === 'customer') {
    subtasks.push(
      { title: `客户分析: ${title}`, description: `分析客户反馈: ${description}`, targetAgentId: 'bezos', type: 'customer', dependsOn: [], priority: 'high' },
      { title: `产品建议: ${title}`, description: `产品化建议: ${description}`, targetAgentId: 'jobs', type: 'product', dependsOn: [0], priority: 'medium' },
    )
  } else {
    subtasks.push(
      { title: `产品视角: ${title}`, description: `从产品角度分析: ${description}`, targetAgentId: 'jobs', type: 'product', dependsOn: [], priority: 'medium' },
      { title: `工程视角: ${title}`, description: `从工程角度分析: ${description}`, targetAgentId: 'linus', type: 'engineering', dependsOn: [], priority: 'medium' },
      { title: `质量视角: ${title}`, description: `从质量角度分析: ${description}`, targetAgentId: 'turing', type: 'verification', dependsOn: [], priority: 'medium' },
    )
  }

  return {
    subtasks,
    reasoning: 'Deterministic fallback decomposition based on task type.',
    confidence: 0.6,
  }
}
