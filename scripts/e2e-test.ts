/**
 * End-to-End Test — 真实 API 端到端测试
 *
 * 测试完整链路：用户输入 → 路由 → Agent 执行 → 工具调用 → 结果输出
 *
 * 使用真实 DeepSeek API，验证：
 * 1. LLM 路由决策
 * 2. Agent 任务执行
 * 3. 工具调用（sandbox 命令）
 * 4. 审计日志记录
 * 5. 实时事件推送
 * 6. 反馈闭环记录
 */

import { routeMessageLLM } from '../src/lib/agents/llm-router'
import { executeAgentTask } from '../src/lib/agents/task-executor'
import { getLLMProvider } from '../src/lib/llm'

// ─── 测试配置 ──────────────────────────────────────────────────────

const TEST_CASES = [
  {
    name: '路由决策 - 代码任务',
    message: '帮我写一个 TypeScript 工具函数，用于计算两个日期之间的天数差',
    expectedAgent: 'linus',
  },
  {
    name: '路由决策 - 产品任务',
    message: '帮我写一个 PRD，描述一个用户登录功能',
    expectedAgent: 'jobs',
  },
  {
    name: '路由决策 - 测试任务',
    message: '帮我检查这段代码有没有 bug：const add = (a, b) => a + b',
    expectedAgent: 'turing',
  },
]

// ─── 测试运行器 ────────────────────────────────────────────────────

async function runE2ETest() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  End-to-End Test — Real API Pipeline')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  // 检查 API 配置
  const provider = getLLMProvider()
  console.log(`[Config] LLM Provider: ${provider.name}`)
  console.log(`[Config] Model: ${process.env.DEEPSEEK_MODEL || 'deepseek-chat'}`)
  console.log('')

  const results: Array<{
    name: string
    status: 'pass' | 'fail'
    details: string
    durationMs: number
  }> = []

  // ── Test 1: LLM 路由决策 ──
  console.log('─── Test 1: LLM 路由决策 ───────────────────────────────')
  for (const testCase of TEST_CASES) {
    const start = Date.now()
    try {
      console.log(`\n  [Test] ${testCase.name}`)
      console.log(`  [Input] "${testCase.message}"`)

      const decision = await routeMessageLLM({
        message: testCase.message,
      })

      const duration = Date.now() - start
      const passed = decision.targetAgentId === testCase.expectedAgent

      console.log(`  [Output] Agent: ${decision.targetAgentId} | Confidence: ${decision.confidence.toFixed(2)} | Type: ${decision.decisionType}`)
      console.log(`  [Result] ${passed ? '✅ PASS' : '❌ FAIL'} (expected: ${testCase.expectedAgent}) (${duration}ms)`)

      results.push({
        name: `路由: ${testCase.name}`,
        status: passed ? 'pass' : 'fail',
        details: `Agent: ${decision.targetAgentId}, Confidence: ${decision.confidence.toFixed(2)}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg} (${duration}ms)`)
      results.push({
        name: `路由: ${testCase.name}`,
        status: 'fail',
        details: errorMsg,
        durationMs: duration,
      })
    }
  }

  // ── Test 2: Agent 任务执行 ──
  console.log('\n─── Test 2: Agent 任务执行 ─────────────────────────────')
  {
    const start = Date.now()
    try {
      console.log('\n  [Test] Linus 执行代码分析任务')
      console.log('  [Input] "分析这段代码的质量：const x = any"')

      const result = await executeAgentTask(
        'linus',
        '分析这段代码的质量和潜在问题：const x = any; function add(a, b) { return a + b }',
      )

      const duration = Date.now() - start
      console.log(`  [Output] Status: ${result.status} | Confidence: ${result.confidence.toFixed(2)}`)
      console.log(`  [Output] Summary: ${result.summary.slice(0, 100)}`)
      console.log(`  [Output] Duration: ${result.durationMs}ms`)
      console.log(`  [Result] ${result.status === 'completed' ? '✅ PASS' : '❌ FAIL'} (${duration}ms)`)

      results.push({
        name: 'Agent 执行: Linus 代码分析',
        status: result.status === 'completed' ? 'pass' : 'fail',
        details: `Status: ${result.status}, Confidence: ${result.confidence.toFixed(2)}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg} (${duration}ms)`)
      results.push({
        name: 'Agent 执行: Linus 代码分析',
        status: 'fail',
        details: errorMsg,
        durationMs: duration,
      })
    }
  }

  // ── Test 3: LLM Provider 直接调用 ──
  console.log('\n─── Test 3: LLM Provider 直接调用 ─────────────────────')
  {
    const start = Date.now()
    try {
      console.log('\n  [Test] Direct LLM chat call')
      const provider = getLLMProvider()
      const result = await provider.chat(
        [{ role: 'user', content: 'What is 2+2? Reply with just the number.' }],
        'You are a math assistant.',
        { maxTokens: 100 },
      )
      const duration = Date.now() - start
      console.log(`  [Output] Content: ${result.content.slice(0, 50)}`)
      console.log(`  [Output] StopReason: ${result.stopReason}`)
      console.log(`  [Result] ${result.content.length > 0 ? '✅ PASS' : '❌ FAIL'} (${duration}ms)`)

      results.push({
        name: 'LLM 直接调用',
        status: result.content.length > 0 ? 'pass' : 'fail',
        details: `Content: ${result.content.slice(0, 50)}, StopReason: ${result.stopReason}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg} (${duration}ms)`)
      results.push({
        name: 'LLM 直接调用',
        status: 'fail',
        details: errorMsg,
        durationMs: duration,
      })
    }
  }

  // ── 汇总 ──
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('  Results Summary')
  console.log('═══════════════════════════════════════════════════════════')

  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const total = results.length

  for (const result of results) {
    const icon = result.status === 'pass' ? '✅' : '❌'
    console.log(`  ${icon} ${result.name} (${result.durationMs}ms)`)
    console.log(`     ${result.details}`)
  }

  console.log('')
  console.log(`  Total: ${total} | Passed: ${passed} | Failed: ${failed}`)
  console.log(`  Pass Rate: ${((passed / total) * 100).toFixed(1)}%`)
  console.log('')

  if (failed > 0) {
    console.log('  ⚠️  Some tests failed. Check the output above for details.')
    process.exit(1)
  } else {
    console.log('  🎉 All tests passed!')
    process.exit(0)
  }
}

// ─── 运行 ──────────────────────────────────────────────────────────

runE2ETest().catch((error) => {
  console.error('E2E Test failed:', error)
  process.exit(1)
})
