import { ExecutionEngine } from '@/lib/execution-engine/engine'
import type { ExecutionRequest } from '@/lib/execution-engine/types'

async function main() {
  console.log('=== 执行引擎测试 ===\n')

  const engine = new ExecutionEngine()

  // 测试 1: 读取文件
  console.log('测试 1: 读取文件')
  const readFileRequest: ExecutionRequest = {
    id: 'test-1',
    type: 'file_operation',
    action: 'read_file',
    input: { path: './package.json' },
    context: {
      taskId: 'test-task',
      correlationId: 'test-correlation',
      agentId: 'test-agent',
      userId: 'test-user',
      permissions: [],
    },
    requiresApproval: false,
  }

  const readFileResult = await engine.execute(readFileRequest)
  console.log(`   状态: ${readFileResult.status}`)
  console.log(`   耗时: ${readFileResult.durationMs}ms`)
  if (readFileResult.output.content) {
    console.log(`   文件大小: ${(readFileResult.output.content as string).length} bytes`)
  }
  console.log('')

  // 测试 2: 列出目录
  console.log('测试 2: 列出目录')
  const listDirRequest: ExecutionRequest = {
    id: 'test-2',
    type: 'file_operation',
    action: 'list_directory',
    input: { path: './src' },
    context: {
      taskId: 'test-task',
      correlationId: 'test-correlation',
      agentId: 'test-agent',
      userId: 'test-user',
      permissions: [],
    },
    requiresApproval: false,
  }

  const listDirResult = await engine.execute(listDirRequest)
  console.log(`   状态: ${listDirResult.status}`)
  console.log(`   耗时: ${listDirResult.durationMs}ms`)
  if (listDirResult.output.count) {
    console.log(`   文件数量: ${listDirResult.output.count}`)
  }
  console.log('')

  // 测试 3: Git 状态
  console.log('测试 3: Git 状态')
  const gitStatusRequest: ExecutionRequest = {
    id: 'test-3',
    type: 'git_operation',
    action: 'git_status',
    input: {},
    context: {
      taskId: 'test-task',
      correlationId: 'test-correlation',
      agentId: 'test-agent',
      userId: 'test-user',
      permissions: [],
    },
    requiresApproval: false,
  }

  const gitStatusResult = await engine.execute(gitStatusRequest)
  console.log(`   状态: ${gitStatusResult.status}`)
  console.log(`   耗时: ${gitStatusResult.durationMs}ms`)
  if (gitStatusResult.output.count) {
    console.log(`   变更文件数量: ${gitStatusResult.output.count}`)
  }
  console.log('')

  // 测试 4: 需要审批的操作
  console.log('测试 4: 需要审批的操作（write_file）')
  const writeFileRequest: ExecutionRequest = {
    id: 'test-4',
    type: 'file_operation',
    action: 'write_file',
    input: { path: './deliverables/test.txt', content: 'Hello World' },
    context: {
      taskId: 'test-task',
      correlationId: 'test-correlation',
      agentId: 'test-agent',
      userId: 'test-user',
      permissions: [],
    },
    requiresApproval: false, // 即使设置为 false，引擎也会检查安全策略
  }

  const writeFileResult = await engine.execute(writeFileRequest)
  console.log(`   状态: ${writeFileResult.status}`)
  console.log(`   错误: ${writeFileResult.error ?? '无'}`)
  console.log('')

  console.log('=== 测试完成 ===')
}

main().catch(console.error)
