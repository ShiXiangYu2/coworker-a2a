import { executeToolCall } from '@/lib/tools/executor'

async function main() {
  console.log('=== 真实执行测试 ===\n')

  // 测试 1: 执行命令
  console.log('测试 1: 执行命令')
  const commandResult = await executeToolCall('execute_command', {
    command: 'echo "Hello from Real Execution!"',
  })
  console.log(`   状态: ${commandResult.success ? '成功' : '失败'}`)
  console.log(`   输出: ${commandResult.output.trim()}`)
  console.log(`   耗时: ${commandResult.durationMs}ms`)
  console.log('')

  // 测试 2: 写入文件
  console.log('测试 2: 写入文件')
  const writeResult = await executeToolCall('write_file', {
    filename: 'test-execution.txt',
    content: `测试真实执行 - ${new Date().toISOString()}\n这是一个真实的文件写入测试。`,
  })
  console.log(`   状态: ${writeResult.success ? '成功' : '失败'}`)
  console.log(`   输出: ${writeResult.output}`)
  console.log(`   耗时: ${writeResult.durationMs}ms`)
  console.log('')

  // 测试 3: 读取文件
  console.log('测试 3: 读取文件')
  const readResult = await executeToolCall('read_file', {
    filename: 'test-execution.txt',
  })
  console.log(`   状态: ${readResult.success ? '成功' : '失败'}`)
  console.log(`   输出: ${readResult.output.substring(0, 100)}...`)
  console.log(`   耗时: ${readResult.durationMs}ms`)
  console.log('')

  // 测试 4: 执行 Git 命令
  console.log('测试 4: 执行 Git 命令')
  const gitResult = await executeToolCall('execute_command', {
    command: 'git status --short',
  })
  console.log(`   状态: ${gitResult.success ? '成功' : '失败'}`)
  console.log(`   输出: ${gitResult.output.substring(0, 200)}...`)
  console.log(`   耗时: ${gitResult.durationMs}ms`)
  console.log('')

  console.log('=== 测试完成 ===')
}

main().catch(console.error)
