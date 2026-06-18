/**
 * 子任务调度器
 *
 * 解析依赖关系，按拓扑排序执行子任务。
 * 无依赖的子任务并行执行，有依赖的子任务等前置完成后执行。
 */

import type { SubTask } from './llm-router'
import { executeAgentTask, type SubTaskResult } from './task-executor'

/** 调度结果 */
export interface ScheduleResult {
  /** 所有子任务结果 */
  results: SubTaskResult[]
  /** 总耗时 */
  totalDurationMs: number
  /** 是否全部成功 */
  allSucceeded: boolean
}

/**
 * 调度子任务执行
 *
 * 1. 拓扑排序（处理依赖）
 * 2. 无依赖的子任务并行执行
 * 3. 有依赖的子任务等前置完成后执行
 */
export async function scheduleSubTasks(
  subtasks: SubTask[],
  _context: { message: string }
): Promise<ScheduleResult> {
  void _context

  const startTime = Date.now()
  const results: SubTaskResult[] = new Array(subtasks.length)
  const completed = new Set<number>()

  // 限制最多 5 个子任务
  const limited = subtasks.slice(0, 5)

  // 拓扑排序执行
  let safetyCounter = 0
  while (completed.size < limited.length && safetyCounter < limited.length) {
    safetyCounter++

    // 找出所有依赖已满足的子任务
    const ready = limited
      .map((st, idx) => ({ st, idx }))
      .filter(({ st, idx }) => {
        if (completed.has(idx)) return false
        return st.dependsOn.every((dep) => completed.has(dep))
      })

    if (ready.length === 0) break // 无更多可执行的任务（可能有循环依赖）

    // 并行执行所有就绪的子任务
    const promises = ready.map(({ st, idx }) =>
      executeWithPreviousResults(st, idx, limited, results)
        .then((result) => {
          results[idx] = result
          completed.add(idx)
        })
        .catch((error) => {
          results[idx] = {
            agentId: st.agentId,
            agentName: st.agentId,
            title: st.title,
            status: 'failed',
            confidence: 0,
            summary: `Execution failed: ${error instanceof Error ? error.message : 'unknown'}`,
            findings: [],
            deliverables: [],
            durationMs: 0,
            error: error instanceof Error ? error.message : 'unknown',
          }
          completed.add(idx) // Mark as completed to unblock dependents
        })
    )

    await Promise.all(promises)
  }

  // Fill in any remaining slots (shouldn't happen but safety net)
  for (let i = 0; i < limited.length; i++) {
    if (!results[i]) {
      results[i] = {
        agentId: limited[i].agentId,
        agentName: limited[i].agentId,
        title: limited[i].title,
        status: 'failed',
        confidence: 0,
        summary: 'Sub-task was not executed (possible circular dependency).',
        findings: [],
        deliverables: [],
        durationMs: 0,
      }
    }
  }

  const allSucceeded = results.every((r) => r.status === 'completed')

  return {
    results,
    totalDurationMs: Date.now() - startTime,
    allSucceeded,
  }
}

/**
 * 执行单个子任务，自动注入前置结果作为上下文
 */
async function executeWithPreviousResults(
  subtask: SubTask,
  index: number,
  allSubtasks: SubTask[],
  completedResults: SubTaskResult[]
): Promise<SubTaskResult> {
  // 收集前置任务的结果
  const previousResults = subtask.dependsOn
    .filter((dep) => completedResults[dep])
    .map((dep) => completedResults[dep])

  return executeAgentTask(
    subtask.agentId,
    `${subtask.title}\n\n${subtask.description}`,
    previousResults.length > 0 ? previousResults : undefined
  )
}
