/**
 * Verify Execution Closure — 验证执行闭环
 *
 * 测试：写代码 → 类型检查 → Lint → 测试 → Git 提交
 */

import { executeCodeClosure } from '../src/lib/execution-closure/engine'

async function verify() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Verify: Execution Closure')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  // Test 1: 创建一个简单的 TypeScript 文件
  console.log('─── Test 1: 写入文件 → 类型检查 → Lint ───────────────')
  {
    const start = Date.now()
    try {
      const result = await executeCodeClosure(
        'linus',
        'verify-test-1',
        [{
          path: 'tmp/verify-test.ts',
          action: 'create',
          content: `// 验证测试文件\nexport function add(a: number, b: number): number {\n  return a + b\n}\n`,
          reason: 'Verify execution closure',
        }],
        'Verify execution closure - create test file',
        { skipTests: true, commitPrefix: 'verify' },
      )

      const duration = Date.now() - start
      console.log(`  [Result] ${result.success ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  [Validation] TypeCheck: ${result.validation.typecheck ? '✅' : '❌'} | Lint: ${result.validation.lint ? '✅' : '❌'} | Test: ${result.validation.test ? '✅' : '❌'}`)
      console.log(`  [Steps] ${result.plan.steps.map((s) => `${s.type}:${s.status}`).join(' → ')}`)
      console.log(`  [Duration] ${duration}ms`)

      return { name: '执行闭环', status: result.success ? 'pass' as const : 'fail' as const, details: `Steps: ${result.plan.steps.length}, Success: ${result.success}`, durationMs: duration }
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      return { name: '执行闭环', status: 'fail' as const, details: errorMsg, durationMs: duration }
    }
  }
}

verify().then((result) => {
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`  ${result.status === 'pass' ? '✅' : '❌'} ${result.name}: ${result.details}`)
  console.log(`  Duration: ${result.durationMs}ms`)
  console.log('═══════════════════════════════════════════════════════════')
  process.exit(result.status === 'pass' ? 0 : 1)
})
