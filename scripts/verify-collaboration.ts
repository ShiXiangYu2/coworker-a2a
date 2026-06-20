/**
 * Verify Agent Collaboration — 验证 Agent 间协作
 *
 * 测试：委派任务 → 接收 → 回复
 */

import { collaborate, receiveHandoff, replyCollaboration } from '../src/lib/collaboration/engine'

async function verify() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Verify: Agent Collaboration')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  const results: Array<{ name: string; status: 'pass' | 'fail'; details: string; durationMs: number }> = []

  // Test 1: Linus 向 Turing 发起协作请求
  console.log('─── Test 1: Linus → Turing 协作请求 ───────────────────')
  {
    const start = Date.now()
    try {
      const result = await collaborate({
        fromAgentId: 'linus',
        toAgentId: 'turing',
        taskId: 'verify-collab-1',
        subject: 'Review my code implementation',
        body: 'I have implemented a new authentication module. Please review the code quality and security.',
        type: 'review_request',
        riskLevel: 'low',
      })

      const duration = Date.now() - start
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Session] ${result.sessionId}`)
      console.log(`  [Thread] ${result.threadId}`)
      console.log(`  [Turn] ${result.turnId}`)
      console.log(`  [Status] ${result.status}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: '协作请求',
        status: 'pass',
        details: `Session: ${result.sessionId.slice(0, 8)}..., Status: ${result.status}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: '协作请求', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // Test 2: Linus 向 Turing 发起 handoff
  console.log('\n─── Test 2: Linus → Turing Handoff ────────────────────')
  {
    const start = Date.now()
    try {
      const result = await collaborate({
        fromAgentId: 'linus',
        toAgentId: 'turing',
        taskId: 'verify-collab-2',
        subject: 'Handoff: Code review task',
        body: 'I have completed the authentication module implementation. Please take over and run the test suite.',
        type: 'handoff',
        riskLevel: 'low',
        contextRefs: {
          memoryEntryIds: ['mem-1', 'mem-2'],
        },
      })

      const duration = Date.now() - start
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Handoff] ${result.handoffId}`)
      console.log(`  [Status] ${result.status}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: 'Handoff 委派',
        status: 'pass',
        details: `Handoff: ${result.handoffId?.slice(0, 8)}..., Status: ${result.status}`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: 'Handoff 委派', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // Test 3: Turing 回复协作
  console.log('\n─── Test 3: Turing 回复协作 ──────────────────────────')
  {
    const start = Date.now()
    try {
      // 先创建一个协作会话
      const collab = await collaborate({
        fromAgentId: 'linus',
        toAgentId: 'turing',
        taskId: 'verify-collab-3',
        subject: 'Request for code review',
        body: 'Please review the authentication module.',
        type: 'review_request',
      })

      // Turing 回复
      const reply = await replyCollaboration(
        collab.threadId,
        'turing',
        'Code review complete',
        'The authentication module looks good. I found 2 minor issues:\n1. Missing input validation on email field\n2. Password hash should use bcrypt instead of sha256',
        'verify-collab-3',
      )

      const duration = Date.now() - start
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Turn] ${reply.turnId}`)
      console.log(`  [Duration] ${duration}ms`)

      results.push({
        name: '协作回复',
        status: 'pass',
        details: `Turn: ${reply.turnId.slice(0, 8)}...`,
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: '协作回复', status: 'fail', details: errorMsg, durationMs: duration })
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
