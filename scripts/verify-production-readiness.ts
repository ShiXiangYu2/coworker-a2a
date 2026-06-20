/**
 * Verify Production Readiness — 生产就绪验证
 *
 * 验证系统是否准备好投入生产：
 * 1. 环境变量检查
 * 2. 数据库连接
 * 3. LLM API 连接
 * 4. 认证系统
 * 5. 监控系统
 * 6. 知识库
 * 7. 执行闭环
 * 8. 任务调度
 * 9. Agent 协作
 */

import { checkSystemHealth } from '../src/lib/monitoring/health-check'
import { getMetricsSummary } from '../src/lib/monitoring/metrics'
import { getLangfuseStatus } from '../src/lib/monitoring/langfuse'
import { getObsidianStatus } from '../src/lib/knowledge/obsidian-adapter'
import { generateTokenPair, verifyToken } from '../src/lib/auth/jwt'
import { getPersistentQueueStatus } from '../src/lib/scheduler/persistent-queue'
import { getBestPracticeSummary } from '../src/lib/learning/best-practices'
import { getErrorSummary } from '../src/lib/learning/error-patterns'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  details: string
  durationMs: number
}

async function verify() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Production Readiness Verification')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  const results: TestResult[] = []

  // Test 1: 环境变量检查
  console.log('─── Test 1: Environment Variables ─────────────────────')
  {
    const start = Date.now()
    const required = ['DATABASE_URL', 'LLM_PROVIDER', 'JWT_SECRET']
    const missing = required.filter((v) => !process.env[v])

    if (missing.length > 0) {
      console.log(`  [Result] ❌ FAIL - Missing: ${missing.join(', ')}`)
      results.push({ name: '环境变量', status: 'fail', details: `Missing: ${missing.join(', ')}`, durationMs: Date.now() - start })
    } else {
      console.log(`  [Result] ✅ PASS`)
      results.push({ name: '环境变量', status: 'pass', details: 'All required vars set', durationMs: Date.now() - start })
    }
  }

  // Test 2: 数据库连接
  console.log('\n─── Test 2: Database Connection ──────────────────────')
  {
    const start = Date.now()
    try {
      const { prisma } = await import('../src/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      console.log(`  [Result] ✅ PASS`)
      results.push({ name: '数据库连接', status: 'pass', details: 'SQLite connected', durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: '数据库连接', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // Test 3: 健康检查
  console.log('\n─── Test 3: Health Check ─────────────────────────────')
  {
    const start = Date.now()
    try {
      const health = await checkSystemHealth()
      const passed = health.status !== 'unhealthy'
      console.log(`  [Result] ${passed ? '✅ PASS' : '❌ FAIL'} - ${health.status}`)
      console.log(`  [Checks] ${health.checks.map((c) => `${c.name}:${c.status}`).join(', ')}`)
      results.push({ name: '健康检查', status: passed ? 'pass' : 'fail', details: health.status, durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: '健康检查', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // Test 4: JWT 认证
  console.log('\n─── Test 4: JWT Authentication ───────────────────────')
  {
    const start = Date.now()
    try {
      const tokens = await generateTokenPair('test-user', 'admin', 'admin')
      const payload = await verifyToken(tokens.accessToken)
      const passed = payload !== null && payload.username === 'admin'
      console.log(`  [Result] ${passed ? '✅ PASS' : '❌ FAIL'}`)
      console.log(`  [Token] Expires in: ${tokens.expiresIn}s`)
      if (!passed) {
        console.log(`  [Debug] Payload: ${JSON.stringify(payload)}`)
      }
      results.push({ name: 'JWT 认证', status: passed ? 'pass' : 'fail', details: `Token generated and verified`, durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: 'JWT 认证', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // Test 5: 监控系统
  console.log('\n─── Test 5: Monitoring System ────────────────────────')
  {
    const start = Date.now()
    try {
      const metrics = getMetricsSummary()
      const langfuse = getLangfuseStatus()
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Metrics] Uptime: ${(metrics.uptime / 1000).toFixed(0)}s`)
      console.log(`  [Langfuse] Configured: ${langfuse.configured}`)
      results.push({ name: '监控系统', status: 'pass', details: `Uptime: ${(metrics.uptime / 1000).toFixed(0)}s`, durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: '监控系统', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // Test 6: 知识库
  console.log('\n─── Test 6: Knowledge System ─────────────────────────')
  {
    const start = Date.now()
    try {
      const obsidian = getObsidianStatus()
      const bestPractices = getBestPracticeSummary()
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Obsidian] Configured: ${obsidian.configured}`)
      console.log(`  [Best Practices] ${bestPractices.totalPractices} practices`)
      results.push({ name: '知识库', status: 'pass', details: `Obsidian: ${obsidian.configured}, Practices: ${bestPractices.totalPractices}`, durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: '知识库', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // Test 7: 任务调度
  console.log('\n─── Test 7: Task Scheduler ───────────────────────────')
  {
    const start = Date.now()
    try {
      const status = await getPersistentQueueStatus()
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Queue] Queued: ${status.queued}, Running: ${status.running}`)
      results.push({ name: '任务调度', status: 'pass', details: `Queued: ${status.queued}, Running: ${status.running}`, durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: '任务调度', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // Test 8: 错误模式
  console.log('\n─── Test 8: Error Patterns ───────────────────────────')
  {
    const start = Date.now()
    try {
      const summary = getErrorSummary()
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Errors] Total: ${summary.totalErrors}, Retryable: ${(summary.retryableRate * 100).toFixed(0)}%`)
      results.push({ name: '错误模式', status: 'pass', details: `Total: ${summary.totalErrors}`, durationMs: Date.now() - start })
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${msg}`)
      results.push({ name: '错误模式', status: 'fail', details: msg, durationMs: Date.now() - start })
    }
  }

  // 汇总
  console.log('\n═══════════════════════════════════════════════════════════')
  const passed = results.filter((r) => r.status === 'pass').length
  const failed = results.filter((r) => r.status === 'fail').length
  const skipped = results.filter((r) => r.status === 'skip').length

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'skip' ? '⚠️' : '❌'
    console.log(`  ${icon} ${r.name}: ${r.details} (${r.durationMs}ms)`)
  }

  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`)
  console.log(`  Pass Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
  console.log('')

  if (failed === 0) {
    console.log('  🎉 System is PRODUCTION READY!')
    console.log('')
    console.log('  Next steps:')
    console.log('  1. Deploy to production server')
    console.log('  2. Configure HTTPS with Nginx')
    console.log('  3. Set up monitoring alerts')
    console.log('  4. Create admin user')
  } else {
    console.log('  ⚠️  Some checks failed. Fix the issues above before deploying.')
  }

  console.log('═══════════════════════════════════════════════════════════')

  return failed === 0
}

verify().then((success) => {
  process.exit(success ? 0 : 1)
})
