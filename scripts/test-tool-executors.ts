import { HttpToolExecutor, CodeExecutor, FileToolExecutor } from '@/lib/executors/tool-executor'
import { GitExecutor } from '@/lib/executors/git-executor'

async function main() {
  console.log('=== 工具执行器测试 ===\n')

  // 测试 1: 文件操作执行器
  console.log('测试 1: 文件操作执行器')
  const fileExecutor = new FileToolExecutor(['./deliverables', './output', './temp'])

  const readResult = await fileExecutor.execute('file_operation', {
    operation: 'read',
    path: './package.json',
  })
  console.log(`   读取文件: ${readResult.success ? '成功' : '失败'}`)
  console.log(`   耗时: ${readResult.durationMs}ms`)
  console.log('')

  // 测试 2: 代码执行器
  console.log('测试 2: 代码执行器')
  const codeExecutor = new CodeExecutor()

  const codeResult = await codeExecutor.execute('execute_code', {
    code: 'console.log("Hello from Execution Engine!")',
    language: 'javascript',
  })
  console.log(`   执行代码: ${codeResult.success ? '成功' : '失败'}`)
  console.log(`   输出: ${(codeResult.output.stdout as string)?.trim()}`)
  console.log(`   耗时: ${codeResult.durationMs}ms`)
  console.log('')

  // 测试 3: Git 执行器
  console.log('测试 3: Git 执行器')
  const gitExecutor = new GitExecutor('.')

  const isGitRepo = await gitExecutor.isGitRepository()
  console.log(`   是 Git 仓库: ${isGitRepo}`)

  if (isGitRepo) {
    const status = await gitExecutor.status()
    console.log(`   当前分支: ${status.currentBranch}`)
    console.log(`   变更文件数: ${status.files.length}`)
    console.log(`   领先远程: ${status.ahead} 个提交`)
    console.log(`   落后远程: ${status.behind} 个提交`)
  }
  console.log('')

  // 测试 4: HTTP 执行器
  console.log('测试 4: HTTP 执行器')
  const httpExecutor = new HttpToolExecutor(['httpbin.org'])

  const httpResult = await httpExecutor.execute('http_request', {
    url: 'https://httpbin.org/get',
    method: 'GET',
  })
  console.log(`   HTTP 请求: ${httpResult.success ? '成功' : '失败'}`)
  console.log(`   状态码: ${(httpResult.output.status as number) ?? 'N/A'}`)
  console.log(`   耗时: ${httpResult.durationMs}ms`)
  console.log('')

  console.log('=== 测试完成 ===')
}

main().catch(console.error)
