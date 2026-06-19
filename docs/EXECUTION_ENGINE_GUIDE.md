# 执行引擎使用指南

## 📖 概述

CoWorker-A2A 的执行引擎提供真实执行能力，支持：
- 命令执行（白名单）
- 文件操作（安全目录）
- 代码执行（JavaScript/Python）
- Git 操作
- API 调用

## 🚀 快速开始

### 1. 使用 API 执行任务

```bash
# 执行命令
curl -X POST http://localhost:3000/api/execution \
  -H "Content-Type: application/json" \
  -d '{"action": "execute_code", "input": {"code": "console.log(\"Hello!\")", "language": "javascript"}}'

# 写入文件
curl -X POST http://localhost:3000/api/execution \
  -H "Content-Type: application/json" \
  -d '{"action": "write_file", "input": {"filename": "test.txt", "content": "Hello World"}}'

# 读取文件
curl -X POST http://localhost:3000/api/execution \
  -H "Content-Type: application/json" \
  -d '{"action": "read_file", "input": {"filename": "test.txt"}}'
```

### 2. 在代码中使用

```typescript
import { executeToolCall } from '@/lib/tools/executor'

// 执行命令
const result = await executeToolCall('execute_command', {
  command: 'echo "Hello!"',
})

// 写入文件
const writeResult = await executeToolCall('write_file', {
  filename: 'test.txt',
  content: 'Hello World',
})

// 读取文件
const readResult = await executeToolCall('read_file', {
  filename: 'test.txt',
})
```

## 📋 支持的操作

### 命令执行
```typescript
executeToolCall('execute_command', { command: 'ls -la' })
```

**白名单命令：**
- `echo`, `date`, `pwd`, `ls`, `cat`, `head`, `tail`
- `wc`, `grep`, `find`
- `git status`, `git log`, `git diff`
- `node -e`

### 文件操作
```typescript
// 写入文件
executeToolCall('write_file', {
  filename: 'deliverables/report.md',
  content: '# Report\n\nContent here...',
})

// 读取文件
executeToolCall('read_file', {
  filename: 'deliverables/report.md',
})
```

**安全限制：**
- 只能写入 `deliverables/` 目录
- 禁止路径遍历（`..`）
- 禁止绝对路径

### 代码执行
```typescript
// JavaScript
executeToolCall('execute_code', {
  code: 'console.log("Hello!")',
  language: 'javascript',
})

// Python
executeToolCall('execute_code', {
  code: 'print("Hello!")',
  language: 'python',
})
```

### Git 操作
```typescript
// Git 状态
executeToolCall('execute_command', { command: 'git status' })

// Git 日志
executeToolCall('execute_command', { command: 'git log --oneline -5' })

// Git diff
executeToolCall('execute_command', { command: 'git diff' })
```

## 🛡️ 安全机制

### 1. 白名单命令
只有白名单中的命令才能执行，防止恶意命令。

### 2. 安全目录
文件操作只能在 `deliverables/` 目录中进行。

### 3. 路径检查
禁止路径遍历和绝对路径。

### 4. 超时控制
所有操作都有超时限制（默认 30 秒）。

### 5. 输出截断
输出长度限制（默认 10000 字符）。

## 🔧 高级用法

### 使用 ExecutionEngine

```typescript
import { ExecutionEngine } from '@/lib/execution-engine/engine'

const engine = new ExecutionEngine()

// 执行任务
const result = await engine.execute({
  id: 'task-1',
  type: 'tool_call',
  action: 'execute_code',
  input: {
    code: 'console.log("Hello from Execution Engine!")',
    language: 'javascript',
  },
  context: {
    taskId: 'task-1',
    correlationId: 'corr-1',
    agentId: 'agent-1',
    userId: 'user-1',
    permissions: [],
  },
  requiresApproval: false,
})
```

### 使用沙箱环境

```typescript
import { SandboxManager } from '@/lib/security/sandbox'

const sandboxManager = new SandboxManager()

// 创建沙箱
const sandbox = await sandboxManager.createSandbox()

// 在沙箱中执行
await sandboxManager.writeFileInSandbox(sandbox.id, 'test.txt', 'Hello')
const content = await sandboxManager.readFileInSandbox(sandbox.id, 'test.txt')

// 清理沙箱
await sandboxManager.destroySandbox(sandbox.id)
```

### 使用权限控制

```typescript
import { PermissionGuard } from '@/lib/security/permission-guard'

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
const result = await permissionGuard.checkPermission('read_file', '/test.txt', 'user1')
console.log(result.allowed) // true
```

### 使用回滚机制

```typescript
import { RollbackManager } from '@/lib/security/rollback-manager'

const rollbackManager = new RollbackManager()

// 创建快照
const snapshot = await rollbackManager.createSnapshot(
  'task-1',
  ['./deliverables/report.md'],
  'Before modification'
)

// 修改文件
// ...

// 回滚
const rollbackResult = await rollbackManager.rollback(snapshot.id)
console.log(rollbackResult.success) // true
```

## ⚠️ 注意事项

1. **安全第一**：所有操作都在安全限制内执行
2. **测试优先**：在生产环境使用前，先在测试环境验证
3. **监控日志**：所有操作都有审计日志
4. **及时回滚**：发现问题时及时回滚到之前的快照

## 📚 相关文档

- [执行引擎架构](./UPGRADE_TO_PRODUCTION.md)
- [安全保障机制](./SECURITY_GUIDE.md)
- [API 文档](./API_DOCUMENTATION.md)
