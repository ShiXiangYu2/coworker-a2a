/**
 * Demo Scenario: 代码质量分析
 *
 * 端到端验证全链路执行能力：
 *   用户输入 → Agent 路由 → Agent 执行沙箱工具 → 产出交付物 → 写入文件
 *
 * 场景：用户说"帮我分析这个项目的代码质量"
 *   → 路由到 Linus Agent（工程）
 *   → Linus 执行 lint + typecheck
 *   → 分析结果，产出代码质量报告
 *   → 报告写入 deliverables/code-quality-report.md
 */

import { routeMessage } from '@/lib/agents/router'
import { produceLLMAgentResult } from '@/lib/agent-runtime/llm-producer'
import { validateAgentResult } from '@/lib/agent-runtime/validator'
import { createSandboxToolExecutor } from '@/lib/tools/sandbox-tool-executor'
import { writeSandboxDeliverable, sprint22FileWriteProfile } from '@/lib/sandbox/file-write-sandbox'
import type { HarmonyTask } from '@/lib/harmony/types'
import type { AgentResult } from '@/lib/agent-runtime/types'

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface DemoScenarioInput {
  /** 用户消息 */
  message: string
  /** 可选：覆盖路由目标 Agent */
  targetAgentId?: string
  /** 可选：工作目录 */
  cwd?: string
}

export interface DemoScenarioStep {
  /** 步骤名称 */
  name: string
  /** 步骤描述 */
  description: string
  /** 执行结果 */
  status: 'completed' | 'failed' | 'skipped'
  /** 耗时 */
  durationMs: number
  /** 详情 */
  detail?: unknown
}

export interface DemoScenarioResult {
  /** 是否成功 */
  success: boolean
  /** 路由决策 */
  routeDecision: ReturnType<typeof routeMessage>
  /** Agent 分析结果 */
  agentResult: AgentResult
  /** 沙箱工具执行记录 */
  toolExecutions: Array<{
    tool: string
    command?: string
    status: string
    durationMs: number
  }>
  /** 交付物信息 */
  deliverables: Array<{
    path: string
    size: number
  }>
  /** 执行步骤 */
  steps: DemoScenarioStep[]
  /** 总耗时 */
  totalDurationMs: number
}

// ─── 核心函数 ──────────────────────────────────────────────────────

/**
 * 运行代码质量分析 Demo 场景
 *
 * 完整流程：
 *   1. 路由决策
 *   2. 构建 Agent 任务
 *   3. Agent 分析（LLM）
 *   4. 执行沙箱工具（lint + typecheck）
 *   5. 产出交付物
 *   6. 写入文件
 */
export async function runCodeQualityDemo(
  input: DemoScenarioInput,
): Promise<DemoScenarioResult> {
  const startTime = Date.now()
  const steps: DemoScenarioStep[] = []
  const toolExecutions: DemoScenarioResult['toolExecutions'] = []
  const deliverables: DemoScenarioResult['deliverables'] = []

  // ─── Step 1: 路由决策 ───────────────────────────────────────────
  const step1Start = Date.now()
  const routeDecision = routeMessage({ message: input.message })
  steps.push({
    name: 'route',
    description: `Routed to agent: ${routeDecision.targetAgentId ?? 'none'} (${routeDecision.decisionType})`,
    status: 'completed',
    durationMs: Date.now() - step1Start,
    detail: routeDecision,
  })

  // 如果路由不支持或需要人工确认，提前返回
  if (routeDecision.decisionType === 'unsupported' || routeDecision.decisionType === 'chat_only') {
    return {
      success: false,
      routeDecision,
      agentResult: {
        status: 'blocked',
        confidence: 0,
        summary: `Cannot process: ${routeDecision.reason}`,
        findings: [],
        proposedChanges: [],
        next: { recommendedAction: 'stop', reason: routeDecision.reason },
        sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
        needsHumanConfirmation: false,
        safetyNotes: ['Demo scenario: routing blocked.'],
      },
      toolExecutions,
      deliverables,
      steps,
      totalDurationMs: Date.now() - startTime,
    }
  }

  const agentId = input.targetAgentId ?? routeDecision.targetAgentId ?? 'linus'

  // ─── Step 2: 构建 Agent 任务 ────────────────────────────────────
  const step2Start = Date.now()
  const task: HarmonyTask = {
    id: `demo-task-${Date.now()}`,
    title: `Code Quality Analysis: ${input.message.slice(0, 50)}`,
    description: input.message,
    sourceMessageText: input.message,
    type: 'engineering',
    status: 'queued',
    routeDecisionType: routeDecision.decisionType,
    routeStatus: routeDecision.status,
    targetAgentId: agentId as HarmonyTask['targetAgentId'],
    confidence: routeDecision.confidence,
    reason: routeDecision.reason,
    matchedSignals: routeDecision.matchedSignals,
    routeDecisionSnapshot: routeDecision as HarmonyTask['routeDecisionSnapshot'],
    requiresHumanConfirmation: false,
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  steps.push({
    name: 'build_task',
    description: `Built HarmonyTask for agent: ${agentId}`,
    status: 'completed',
    durationMs: Date.now() - step2Start,
  })

  // ─── Step 3: Agent 分析（LLM）────────────────────────────────────
  const step3Start = Date.now()
  let agentResult: AgentResult
  try {
    const rawResult = await produceLLMAgentResult(task)
    agentResult = validateAgentResult(rawResult)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    agentResult = {
      status: 'failed',
      confidence: 0,
      summary: `Agent analysis failed: ${errorMessage}`,
      findings: [`LLM error: ${errorMessage}`],
      proposedChanges: [],
      next: { recommendedAction: 'ask_human_confirmation', reason: errorMessage },
      sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
      needsHumanConfirmation: false,
      safetyNotes: [`Demo scenario LLM error: ${errorMessage}`],
    }
  }
  steps.push({
    name: 'agent_analysis',
    description: `Agent ${agentId} produced analysis: ${agentResult.summary.slice(0, 80)}`,
    status: agentResult.status === 'failed' ? 'failed' : 'completed',
    durationMs: Date.now() - step3Start,
    detail: { status: agentResult.status, confidence: agentResult.confidence },
  })

  // ─── Step 4: 执行沙箱工具 ───────────────────────────────────────
  const step4Start = Date.now()
  const executor = createSandboxToolExecutor(agentId, { timeoutMs: 30_000 })

  // 执行 lint
  const lintResult = await executor('run_lint', {})
  toolExecutions.push({
    tool: 'run_lint',
    status: lintResult.success ? 'success' : 'failed',
    durationMs: 0, // executor doesn't return duration
  })

  // 执行 typecheck
  const typecheckResult = await executor('run_typecheck', {})
  toolExecutions.push({
    tool: 'run_typecheck',
    status: typecheckResult.success ? 'success' : 'failed',
    durationMs: 0,
  })

  steps.push({
    name: 'sandbox_tools',
    description: `Executed lint (${lintResult.success ? 'pass' : 'fail'}) + typecheck (${typecheckResult.success ? 'pass' : 'fail'})`,
    status: 'completed',
    durationMs: Date.now() - step4Start,
    detail: { lint: lintResult.success, typecheck: typecheckResult.success },
  })

  // ─── Step 5: 产出交付物 ─────────────────────────────────────────
  const step5Start = Date.now()
  const lintOutput = (lintResult.output as Record<string, unknown>)?.stdout as string ?? ''
  const typecheckOutput = (typecheckResult.output as Record<string, unknown>)?.stdout as string ?? ''

  const reportContent = buildQualityReport(
    input.message,
    agentId,
    agentResult,
    lintResult.success,
    typecheckResult.success,
    lintOutput,
    typecheckOutput,
  )

  // ─── Step 6: 写入文件 ───────────────────────────────────────────
  const step6Start = Date.now()
  try {
    const writeResult = await writeSandboxDeliverable(
      {
        targetPath: 'deliverables/code-quality-report.md',
        content: reportContent,
        format: 'md',
      },
      { profile: sprint22FileWriteProfile },
    )
    deliverables.push({
      path: writeResult.relativePath,
      size: writeResult.bytesWritten,
    })
    steps.push({
      name: 'write_report',
      description: `Report written to ${writeResult.relativePath} (${writeResult.bytesWritten} bytes)`,
      status: 'completed',
      durationMs: Date.now() - step6Start,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    steps.push({
      name: 'write_report',
      description: `Failed to write report: ${errorMessage}`,
      status: 'failed',
      durationMs: Date.now() - step6Start,
    })
  }

  steps.push({
    name: 'build_deliverables',
    description: `Built quality report from agent analysis + tool execution results`,
    status: 'completed',
    durationMs: Date.now() - step5Start,
  })

  return {
    success: deliverables.length > 0,
    routeDecision,
    agentResult,
    toolExecutions,
    deliverables,
    steps,
    totalDurationMs: Date.now() - startTime,
  }
}

// ─── 报告构建 ──────────────────────────────────────────────────────

function buildQualityReport(
  userMessage: string,
  agentId: string,
  agentResult: AgentResult,
  lintPassed: boolean,
  typecheckPassed: boolean,
  lintOutput: string,
  typecheckOutput: string,
): string {
  const now = new Date().toISOString().split('T')[0]
  const statusEmoji = (passed: boolean) => (passed ? '✅' : '❌')

  return `# 代码质量分析报告

> 自动生成于 ${now} | Agent: ${agentId} | 置信度: ${(agentResult.confidence * 100).toFixed(0)}%

---

## 用户请求

${userMessage}

## 分析摘要

${agentResult.summary}

## 关键发现

${agentResult.findings.length > 0
    ? agentResult.findings.map((f) => `- ${f}`).join('\n')
    : '- 无特别发现'}

## 工具执行结果

| 检查项 | 状态 | 详情 |
|--------|------|------|
| Lint | ${statusEmoji(lintPassed)} ${lintPassed ? '通过' : '失败'} | ${lintPassed ? '代码规范检查通过' : '存在规范问题'} |
| TypeCheck | ${statusEmoji(typecheckPassed)} ${typecheckPassed ? '通过' : '失败'} | ${typecheckPassed ? '类型检查通过' : '存在类型错误'} |

### Lint 输出

\`\`\`
${lintOutput.slice(0, 2000) || '(无输出)'}
\`\`\`

### TypeCheck 输出

\`\`\`
${typecheckOutput.slice(0, 2000) || '(无输出)'}
\`\`\`

## 建议变更

${agentResult.proposedChanges.length > 0
    ? agentResult.proposedChanges.map((c) => `### ${c.title}\n\n${c.description}\n\n风险级别: ${c.riskLevel}`).join('\n\n')
    : '无建议变更'}

## 下一步

- 推荐操作: ${agentResult.next.recommendedAction}
- 原因: ${agentResult.next.reason}

---

*本报告由 coworker-a2a Demo Scenario 自动生成*
`
}
