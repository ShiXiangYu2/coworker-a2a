/**
 * Verify Task Scheduler — 验证任务调度器
 *
 * 测试：提交任务 → 预算检查 → 限速检查 → 队列管理
 */

import { submitTask, getSchedulerStatus } from '../src/lib/scheduler/scheduler'
import { checkBudget, recordTokenUsage, getBudget, getCostSummary } from '../src/lib/scheduler/token-budget'
import { checkRateLimit, getRateLimitState } from '../src/lib/scheduler/rate-limiter'
import { enqueueTask, getQueueStatus } from '../src/lib/scheduler/task-queue'

async function verify() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Verify: Task Scheduler')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  const results: Array<{ name: string; status: 'pass' | 'fail'; details: string; durationMs: number }> = []

  // Test 1: Token 预算检查
  console.log('─── Test 1: Token 预算检查 ────────────────────────────')
  {
    const start = Date.now()
    try {
      // 检查预算（应该通过）
      const error = checkBudget('linus', 'task-1', 5000)
      const passed = error === null

      // 记录 token 使用
      recordTokenUsage('linus', {
        inputTokens: 2000,
        outputTokens: 1000,
        totalTokens: 3000,
        estimatedCostUsd: 0.01,
      }, { taskId: 'task-1', provider: 'deepseek', model: 'deepseek-v4-flash' })

      // 获取预算状态
      const budget = getBudget()
      const cost = getCostSummary()

      const duration = Date.now() - start
      console.log(`  [Result] ${passed ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  [Budget] Used today: ${budget.usedToday} tokens`)
      console.log(`  [Cost] Today: $${cost.todayCostUsd}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: 'Token 预算',
        status: passed ? 'pass' : 'fail',
        details: `Used: ${budget.usedToday}, Cost: $${cost.todayCostUsd}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: 'Token 预算', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // Test 2: 限速检查
  console.log('\n─── Test 2: 限速检查 ─────────────────────────────────')
  {
    const start = Date.now()
    try {
      // 检查限速（应该通过）
      const waitMs = checkRateLimit(1000)
      const passed = waitMs === null

      // 获取限速状态
      const state = getRateLimitState()

      const duration = Date.now() - start
      console.log(`  [Result] ${passed ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  [RateLimit] Minute requests: ${state.minuteRequestCount}`)
      console.log(`  [RateLimit] Is limited: ${state.isLimited}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: '限速检查',
        status: passed ? 'pass' : 'fail',
        details: `Requests: ${state.minuteRequestCount}, Limited: ${state.isLimited}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: '限速检查', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // Test 3: 任务提交
  console.log('\n─── Test 3: 任务提交 ─────────────────────────────────')
  {
    const start = Date.now()
    try {
      const result = submitTask({
        agentId: 'linus',
        description: 'Implement authentication module',
        priority: 'high',
        estimatedTokens: 10000,
      })

      const duration = Date.now() - start
      const passed = result.status === 'queued'
      console.log(`  [Result] ${passed ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  [Task] ID: ${result.taskId}`)
      console.log(`  [Task] Status: ${result.status}`)
      console.log(`  [Task] Queue position: ${result.queuePosition}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: '任务提交',
        status: passed ? 'pass' : 'fail',
        details: `Status: ${result.status}, Position: ${result.queuePosition}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: '任务提交', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // Test 4: 队列状态
  console.log('\n─── Test 4: 队列状态 ─────────────────────────────────')
  {
    const start = Date.now()
    try {
      const status = getSchedulerStatus()

      const duration = Date.now() - start
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Queue] Queued: ${status.queue.queued}, Running: ${status.queue.running}`)
      console.log(`  [Budget] Used today: ${status.budget.usedToday}`)
      console.log(`  [Cost] Today: $${status.cost.todayCostUsd}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: '队列状态',
        status: 'pass',
        details: `Queued: ${status.queue.queued}, Running: ${status.queue.running}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: '队列状态', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // 汇总
  console.log('\n═══════════════════════════════════════════════════════════')
  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  for (const r of results) {
    console.log(`  ${r.status === 'pass' ? '✅' : '❌'} ${r.name}: ${r.details} (${r.durationMs}ms)`)
  }
  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)
  console.log('═══════════════════════════════════════════════════════════')

  return failed === 0
}

verify().then((success) => {
  process.exit(success ? 0 : 1)
})
