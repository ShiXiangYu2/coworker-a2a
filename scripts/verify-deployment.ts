/**
 * Verify Deployment Pipeline — 验证部署流水线
 *
 * 测试：GitHub 配置检查 → 客户端初始化
 * 注意：需要配置 GITHUB_TOKEN 才能运行完整测试
 */

import { isGitHubConfigured, getRepoInfo } from '../src/lib/deployment/github-client'

async function verify() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Verify: Deployment Pipeline')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  const results: Array<{ name: string; status: 'pass' | 'fail' | 'skip'; details: string; durationMs: number }> = []

  // Test 1: GitHub 配置检查
  console.log('─── Test 1: GitHub 配置检查 ───────────────────────────')
  {
    const start = Date.now()
    const configured = isGitHubConfigured()
    const duration = Date.now() - start

    if (configured) {
      const info = getRepoInfo()
      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Config] Repository: ${info.fullName}`)
      results.push({
        name: 'GitHub 配置',
        status: 'pass',
        details: `Repository: ${info.fullName}`,
        durationMs: duration,
      })
    } else {
      console.log(`  [Result] ⚠️ SKIP`)
      console.log(`  [Config] GitHub not configured`)
      console.log(`  [Config] Required env vars: GITHUB_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME`)
      console.log(`  [Config] Add to .env:`)
      console.log(`    GITHUB_TOKEN=ghp_xxxxxxxxxxxx`)
      console.log(`    GITHUB_REPO_OWNER=your-org`)
      console.log(`    GITHUB_REPO_NAME=your-repo`)
      results.push({
        name: 'GitHub 配置',
        status: 'skip',
        details: 'GitHub not configured (GITHUB_TOKEN missing)',
        durationMs: duration,
      })
    }
  }

  // Test 2: 部署流水线类型检查
  console.log('\n─── Test 2: 部署流水线类型检查 ───────────────────────')
  {
    const start = Date.now()
    try {
      // 动态导入以验证模块可加载
      const { runPipeline } = await import('../src/lib/deployment/pipeline')
      const duration = Date.now() - start

      console.log(`  [Result] ✅ PASS`)
      console.log(`  [Module] Pipeline module loaded successfully`)
      console.log(`  [Function] runPipeline: ${typeof runPipeline}`)
      results.push({
        name: '流水线模块',
        status: 'pass',
        details: 'Module loaded, runPipeline available',
        durationMs: duration,
      })
    } catch (error) {
      const duration = Date.now() - start
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.log(`  [Result] ❌ FAIL - ${errorMsg}`)
      results.push({ name: '流水线模块', status: 'fail', details: errorMsg, durationMs: duration })
    }
  }

  // 汇总
  console.log('\n═══════════════════════════════════════════════════════════')
  const passed = results.filter((r) => r.status === 'pass').length
  const skipped = results.filter((r) => r.status === 'skip').length
  const failed = results.filter((r) => r.status === 'fail').length
  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'skip' ? '⚠️' : '❌'
    console.log(`  ${icon} ${r.name}: ${r.details} (${r.durationMs}ms)`)
  }
  console.log(`\n  Total: ${results.length} | Passed: ${passed} | Skipped: ${skipped} | Failed: ${failed}`)

  if (skipped > 0) {
    console.log('\n  💡 To run full deployment tests, configure GitHub in .env:')
    console.log('    GITHUB_TOKEN=ghp_xxxxxxxxxxxx')
    console.log('    GITHUB_REPO_OWNER=your-org')
    console.log('    GITHUB_REPO_NAME=your-repo')
  }

  console.log('═══════════════════════════════════════════════════════════')

  return failed === 0
}

verify().then((success) => {
  process.exit(success ? 0 : 1)
})
