import { SandboxManager } from '@/lib/security/sandbox'
import { PermissionGuard } from '@/lib/security/permission-guard'
import { RollbackManager } from '@/lib/security/rollback-manager'

async function main() {
  console.log('=== 安全保障测试 ===\n')

  // 测试 1: 沙箱管理器
  console.log('测试 1: 沙箱管理器')
  const sandboxManager = new SandboxManager()

  const sandbox = await sandboxManager.createSandbox({
    allowedRoots: ['./deliverables', './temp'],
    maxExecutionTimeMs: 10000,
  })
  console.log(`   创建沙箱: ${sandbox.id}`)
  console.log(`   临时目录: ${sandbox.tempDir}`)

  // 在沙箱中写入文件
  await sandboxManager.writeFileInSandbox(sandbox.id, 'test.txt', 'Hello Sandbox!')
  const content = await sandboxManager.readFileInSandbox(sandbox.id, 'test.txt')
  console.log(`   写入文件: ${content}`)

  // 在沙箱中执行命令
  const result = await sandboxManager.executeInSandbox(sandbox.id, 'echo "Hello from sandbox"')
  console.log(`   执行命令: ${result.stdout.trim()}`)

  // 清理沙箱
  await sandboxManager.destroySandbox(sandbox.id)
  console.log(`   清理沙箱: 完成`)
  console.log('')

  // 测试 2: 权限控制
  console.log('测试 2: 权限控制')
  const permissionGuard = new PermissionGuard()

  // 注册用户权限
  permissionGuard.registerUser('user1', {
    userId: 'user1',
    level: 'write',
    allowedActions: ['read_file', 'execute_code'],
    deniedActions: ['git_push'],
    restrictions: {},
  })

  // 检查权限
  const readPermission = await permissionGuard.checkPermission('read_file', '/test.txt', 'user1')
  console.log(`   读取文件权限: ${readPermission.allowed ? '允许' : '拒绝'} - ${readPermission.reason}`)

  const writePermission = await permissionGuard.checkPermission('write_file', '/test.txt', 'user1')
  console.log(`   写入文件权限: ${writePermission.allowed ? '允许' : '拒绝'} - ${writePermission.reason}`)

  const pushPermission = await permissionGuard.checkPermission('git_push', '/repo', 'user1')
  console.log(`   Git Push 权限: ${pushPermission.allowed ? '允许' : '拒绝'} - ${pushPermission.reason}`)

  // 请求权限
  const request = await permissionGuard.requestPermission('git_push', '/repo', 'user1')
  console.log(`   权限请求: ${request.id}`)

  // 批准权限
  const decision = await permissionGuard.approveRequest(request.id, 'admin', '批准 Git Push')
  console.log(`   权限决策: ${decision.decision} - ${decision.reason}`)
  console.log('')

  // 测试 3: 回滚管理器
  console.log('测试 3: 回滚管理器')
  const rollbackManager = new RollbackManager('./test-snapshots')

  // 创建测试文件
  const fs = await import('fs/promises')
  await fs.mkdir('./temp', { recursive: true })
  await fs.writeFile('./temp/test-rollback.txt', 'Original content', 'utf-8')

  // 创建快照
  const snapshot = await rollbackManager.createSnapshot(
    'test-task',
    ['./temp/test-rollback.txt'],
    'Before modification'
  )
  console.log(`   创建快照: ${snapshot.id}`)

  // 修改文件
  await fs.writeFile('./temp/test-rollback.txt', 'Modified content', 'utf-8')
  const modifiedContent = await fs.readFile('./temp/test-rollback.txt', 'utf-8')
  console.log(`   修改后内容: ${modifiedContent}`)

  // 回滚
  const rollbackResult = await rollbackManager.rollback(snapshot.id)
  console.log(`   回滚结果: ${rollbackResult.success ? '成功' : '失败'}`)

  const restoredContent = await fs.readFile('./temp/test-rollback.txt', 'utf-8')
  console.log(`   回滚后内容: ${restoredContent}`)

  // 清理
  await fs.rm('./temp', { recursive: true, force: true })
  await fs.rm('./test-snapshots', { recursive: true, force: true })
  console.log('')

  console.log('=== 测试完成 ===')
}

main().catch(console.error)
