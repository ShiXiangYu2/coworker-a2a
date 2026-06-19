import { executeToolCall } from '@/lib/tools/executor'
import { ExecutionEngine } from '@/lib/execution-engine/engine'
import { SandboxManager } from '@/lib/security/sandbox'
import { PermissionGuard } from '@/lib/security/permission-guard'
import { RollbackManager } from '@/lib/security/rollback-manager'

async function main() {
  console.log('=== 集成测试 ===\n')

  let passed = 0
  let failed = 0

  // 测试 1: 工具执行器
  console.log('测试 1: 工具执行器')
  try {
    const result = await executeToolCall('execute_command', {
      command: 'echo "Integration Test"',
    })
    if (result.success && result.output.trim() === '"Integration Test"') {
      console.log('   ✅ 通过')
      passed++
    } else {
      console.log('   ❌ 失败')
      failed++
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error}`)
    failed++
  }
  console.log('')

  // 测试 2: 执行引擎
  console.log('测试 2: 执行引擎')
  try {
    const engine = new ExecutionEngine()
    const result = await engine.execute({
      id: 'test-integration',
      type: 'tool_call',
      action: 'execute_code',
      input: {
        code: 'console.log("Execution Engine Test")',
        language: 'javascript',
      },
      context: {
        taskId: 'test-task',
        correlationId: 'test-correlation',
        agentId: 'test-agent',
        userId: 'test-user',
        permissions: [],
      },
      requiresApproval: false,
    })
    if (result.status === 'completed') {
      console.log('   ✅ 通过')
      passed++
    } else {
      console.log('   ❌ 失败')
      failed++
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error}`)
    failed++
  }
  console.log('')

  // 测试 3: 沙箱管理器
  console.log('测试 3: 沙箱管理器')
  try {
    const sandboxManager = new SandboxManager()
    const sandbox = await sandboxManager.createSandbox()
    await sandboxManager.writeFileInSandbox(sandbox.id, 'test.txt', 'Sandbox Test')
    const content = await sandboxManager.readFileInSandbox(sandbox.id, 'test.txt')
    await sandboxManager.destroySandbox(sandbox.id)
    if (content === 'Sandbox Test') {
      console.log('   ✅ 通过')
      passed++
    } else {
      console.log('   ❌ 失败')
      failed++
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error}`)
    failed++
  }
  console.log('')

  // 测试 4: 权限控制
  console.log('测试 4: 权限控制')
  try {
    const permissionGuard = new PermissionGuard()
    permissionGuard.registerUser('test-user', {
      userId: 'test-user',
      level: 'write',
      allowedActions: ['read_file', 'execute_code'],
      deniedActions: ['git_push'],
      restrictions: {},
    })
    const result = await permissionGuard.checkPermission('read_file', '/test.txt', 'test-user')
    if (result.allowed) {
      console.log('   ✅ 通过')
      passed++
    } else {
      console.log('   ❌ 失败')
      failed++
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error}`)
    failed++
  }
  console.log('')

  // 测试 5: 回滚管理器
  console.log('测试 5: 回滚管理器')
  try {
    const fs = await import('fs/promises')
    const rollbackManager = new RollbackManager('./test-snapshots')
    await fs.mkdir('./temp', { recursive: true })
    await fs.writeFile('./temp/test-rollback.txt', 'Original', 'utf-8')
    const snapshot = await rollbackManager.createSnapshot('test-task', ['./temp/test-rollback.txt'], 'Test')
    await fs.writeFile('./temp/test-rollback.txt', 'Modified', 'utf-8')
    const rollbackResult = await rollbackManager.rollback(snapshot.id)
    const content = await fs.readFile('./temp/test-rollback.txt', 'utf-8')
    await fs.rm('./temp', { recursive: true, force: true })
    await fs.rm('./test-snapshots', { recursive: true, force: true })
    if (rollbackResult.success && content === 'Original') {
      console.log('   ✅ 通过')
      passed++
    } else {
      console.log('   ❌ 失败')
      failed++
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error}`)
    failed++
  }
  console.log('')

  // 测试 6: API 端点
  console.log('测试 6: API 端点')
  try {
    const response = await fetch('http://localhost:3000/api/execution?action=list')
    const data = await response.json()
    if (data.ok && data.data.actions.length > 0) {
      console.log('   ✅ 通过')
      passed++
    } else {
      console.log('   ❌ 失败')
      failed++
    }
  } catch (error) {
    console.log(`   ❌ 失败: ${error}`)
    failed++
  }
  console.log('')

  // 总结
  console.log('=== 测试总结 ===')
  console.log(`通过: ${passed}`)
  console.log(`失败: ${failed}`)
  console.log(`总计: ${passed + failed}`)
  console.log(`成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
}

main().catch(console.error)
