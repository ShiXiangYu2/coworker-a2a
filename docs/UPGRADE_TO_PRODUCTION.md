# 升级到真实生产系统计划

## 📊 当前状态 vs 目标状态

| 维度 | 当前状态 | 目标状态 |
|------|----------|----------|
| LLM 调用 | ✅ 真实调用 | ✅ 保持 |
| Agent 路由 | ✅ 真实路由 | ✅ 保持 |
| 任务执行 | ⚠️ 仅记录 | ✅ 真实执行 |
| 工具调用 | ⚠️ 仅记录 | ✅ 真实执行 |
| 文件操作 | ⚠️ 仅 dry_run | ✅ 真实写入 |
| Git 操作 | ❌ 禁止 | ✅ 真实执行 |
| 部署发布 | ❌ 禁止 | ✅ 真实执行 |

---

## 🎯 升级目标

将 CoWorker-A2A 从 **"AI 治理原型"** 升级为 **"真实生产级 AI 执行系统"**。

### 核心能力
1. **真实任务执行** - Agent 能真正执行任务并产出结果
2. **真实工具调用** - 能真正调用外部 API 和工具
3. **真实文件操作** - 能真正创建、读取、修改文件
4. **真实 Git 操作** - 能真正执行 Git 命令
5. **安全保障** - 沙箱执行、权限控制、回滚机制

---

## 📋 升级计划

### 阶段 1：执行引擎架构（1-2 周）

#### 1.1 设计执行引擎架构
```
用户请求 → Agent 路由 → 任务创建 → 执行计划 → 执行引擎 → 结果返回
                                    ↓
                              安全检查 → 沙箱执行 → 结果验证 → 状态更新
```

#### 1.2 核心组件
- **ExecutionEngine** - 执行引擎核心
- **ToolExecutor** - 工具执行器
- **FileExecutor** - 文件操作执行器
- **GitExecutor** - Git 操作执行器
- **SandboxManager** - 沙箱管理器
- **SecurityGuard** - 安全守卫

#### 1.3 数据库扩展
```sql
-- 执行任务表
CREATE TABLE execution_tasks (
  id TEXT PRIMARY KEY,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  input JSON,
  output JSON,
  error JSON,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- 执行日志表
CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT,
  step_index INTEGER,
  action TEXT,
  input JSON,
  output JSON,
  status TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP
);
```

---

### 阶段 2：工具执行器（2-3 周）

#### 2.1 工具执行器接口
```typescript
interface ToolExecutor {
  execute(toolCall: ToolCall): Promise<ToolResult>
  validate(toolCall: ToolCall): Promise<boolean>
  rollback(toolCall: ToolCall): Promise<void>
}
```

#### 2.2 支持的工具类型
1. **HTTP 请求工具** - 调用外部 API
2. **数据库查询工具** - 查询数据库
3. **文件操作工具** - 读写文件
4. **代码执行工具** - 执行代码片段
5. **通知工具** - 发送通知

#### 2.3 安全策略
```typescript
const securityPolicy = {
  allowedDomains: ['api.example.com', 'api.github.com'],
  blockedPatterns: ['DROP TABLE', 'DELETE FROM'],
  maxExecutionTime: 30000,
  maxRetries: 3,
  requireApproval: ['external_api', 'file_write', 'git_push']
}
```

---

### 阶段 3：文件操作（2-3 周）

#### 3.1 文件操作接口
```typescript
interface FileExecutor {
  readFile(path: string): Promise<string>
  writeFile(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  listDirectory(path: string): Promise<string[]>
  searchFiles(pattern: string): Promise<string[]>
}
```

#### 3.2 安全限制
- **允许的目录**：`./deliverables/`, `./output/`, `./temp/`
- **禁止的目录**：`./node_modules/`, `./.git/`, `./src/`
- **允许的扩展名**：`.md`, `.json`, `.txt`, `.html`, `.css`, `.js`
- **禁止的扩展名**：`.exe`, `.sh`, `.bat`, `.ps1`

#### 3.3 沙箱执行
```typescript
class SandboxFileExecutor implements FileExecutor {
  private allowedRoots: string[]
  
  constructor(allowedRoots: string[]) {
    this.allowedRoots = allowedRoots
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    const resolvedPath = path.resolve(path)
    if (!this.isAllowed(resolvedPath)) {
      throw new Error(`Path not allowed: ${path}`)
    }
    await fs.writeFile(resolvedPath, content)
  }
  
  private isAllowed(path: string): boolean {
    return this.allowedRoots.some(root => path.startsWith(root))
  }
}
```

---

### 阶段 4：Git 操作（2-3 周）

#### 4.1 Git 操作接口
```typescript
interface GitExecutor {
  status(): Promise<GitStatus>
  add(files: string[]): Promise<void>
  commit(message: string): Promise<void>
  push(): Promise<void>
  pull(): Promise<void>
  createBranch(name: string): Promise<void>
  checkout(branch: string): Promise<void>
  merge(branch: string): Promise<void>
}
```

#### 4.2 安全限制
- **禁止的操作**：`git push --force`, `git reset --hard`
- **需要审批的操作**：`git push`, `git merge`
- **自动操作**：`git status`, `git add`, `git commit`

#### 4.3 沙箱 Git 执行
```typescript
class SandboxGitExecutor implements GitExecutor {
  private repoPath: string
  private sandboxPath: string
  
  constructor(repoPath: string) {
    this.repoPath = repoPath
    this.sandboxPath = path.join(repoPath, '.git-sandbox')
  }
  
  async commit(message: string): Promise<void> {
    // 在沙箱中创建 commit
    await exec(`git -C ${this.sandboxPath} commit -m "${message}"`)
  }
  
  async push(): Promise<void> {
    // 需要人工审批
    throw new Error('Push requires human approval')
  }
}
```

---

### 阶段 5：安全保障（2-3 周）

#### 5.1 沙箱环境
```typescript
class ExecutionSandbox {
  private tempDir: string
  
  constructor() {
    this.tempDir = fs.mkdtempSync('coworker-sandbox-')
  }
  
  async execute(command: string): Promise<ExecutionResult> {
    try {
      const result = await exec(command, {
        cwd: this.tempDir,
        timeout: 30000,
        env: { ...process.env, NODE_ENV: 'sandbox' }
      })
      return { success: true, output: result.stdout }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }
  
  async cleanup(): Promise<void> {
    await fs.rm(this.tempDir, { recursive: true })
  }
}
```

#### 5.2 权限控制
```typescript
interface PermissionGuard {
  checkPermission(action: string, context: ExecutionContext): Promise<boolean>
  requestApproval(action: string, context: ExecutionContext): Promise<boolean>
  auditLog(action: string, context: ExecutionContext, result: boolean): Promise<void>
}
```

#### 5.3 回滚机制
```typescript
class RollbackManager {
  private snapshots: Map<string, Snapshot>
  
  async createSnapshot(taskId: string): Promise<string> {
    const snapshotId = randomUUID()
    this.snapshots.set(snapshotId, {
      taskId,
      timestamp: new Date(),
      state: await this.captureState()
    })
    return snapshotId
  }
  
  async rollback(snapshotId: string): Promise<void> {
    const snapshot = this.snapshots.get(snapshotId)
    if (!snapshot) throw new Error('Snapshot not found')
    await this.restoreState(snapshot.state)
  }
}
```

---

## 🚀 实施步骤

### 步骤 1：创建执行引擎核心（第 1 周）
```bash
# 创建执行引擎目录
mkdir -p src/lib/execution-engine

# 创建核心文件
touch src/lib/execution-engine/engine.ts
touch src/lib/execution-engine/types.ts
touch src/lib/execution-engine/sandbox.ts
touch src/lib/execution-engine/security.ts
```

### 步骤 2：实现工具执行器（第 2-3 周）
```bash
# 创建工具执行器目录
mkdir -p src/lib/executors

# 创建执行器文件
touch src/lib/executors/tool-executor.ts
touch src/lib/executors/file-executor.ts
touch src/lib/executors/git-executor.ts
touch src/lib/executors/http-executor.ts
```

### 步骤 3：实现安全保障（第 4-5 周）
```bash
# 创建安全模块目录
mkdir -p src/lib/security

# 创建安全文件
touch src/lib/security/permission-guard.ts
touch src/lib/security/rollback-manager.ts
touch src/lib/security/audit-logger.ts
```

### 步骤 4：集成到现有系统（第 6 周）
```bash
# 修改 chat route.ts，支持真实执行
# 修改 agent-runtime，支持真实工具调用
# 修改 tool-calls，支持真实工具执行
```

---

## 📊 预期成果

### 能力提升
| 能力 | 升级前 | 升级后 |
|------|--------|--------|
| 任务执行 | 仅记录 | 真实执行 |
| 工具调用 | 仅记录 | 真实调用 |
| 文件操作 | 仅 dry_run | 真实写入 |
| Git 操作 | 禁止 | 真实执行 |
| 安全保障 | 无 | 沙箱+权限+回滚 |

### 安全保障
- ✅ 沙箱执行环境
- ✅ 权限控制系统
- ✅ 回滚机制
- ✅ 审计日志
- ✅ 人工审批流程

---

## ⚠️ 风险评估

### 高风险
- **文件系统损坏** - 通过沙箱和权限控制缓解
- **Git 仓库损坏** - 通过备份和回滚机制缓解
- **外部 API 滥用** - 通过速率限制和审批流程缓解

### 中风险
- **性能问题** - 通过异步执行和队列管理缓解
- **并发冲突** - 通过锁机制和事务管理缓解

### 低风险
- **数据丢失** - 通过备份和快照机制缓解

---

## 🎯 成功标准

### 功能标准
- ✅ Agent 能真实执行任务
- ✅ 工具能真实调用外部 API
- ✅ 文件能真实创建和修改
- ✅ Git 能真实执行操作

### 安全标准
- ✅ 所有操作都在沙箱中执行
- ✅ 敏感操作需要人工审批
- ✅ 所有操作都有审计日志
- ✅ 支持回滚和恢复

### 性能标准
- ✅ 任务执行时间 < 30 秒
- ✅ 工具调用响应时间 < 5 秒
- ✅ 文件操作响应时间 < 1 秒

---

## 📅 时间线

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| 阶段 1：执行引擎架构 | 第 1-2 周 | 架构设计文档、核心接口 |
| 阶段 2：工具执行器 | 第 3-5 周 | 工具执行器实现 |
| 阶段 3：文件操作 | 第 5-7 周 | 文件操作实现 |
| 阶段 4：Git 操作 | 第 7-9 周 | Git 操作实现 |
| 阶段 5：安全保障 | 第 9-11 周 | 安全模块实现 |
| 阶段 6：系统集成 | 第 11-12 周 | 完整系统集成 |

**总时间：12 周（3 个月）**

---

## 💡 建议

### 优先级
1. **P0**：执行引擎架构和核心接口
2. **P0**：安全保障（沙箱、权限、回滚）
3. **P1**：工具执行器
4. **P1**：文件操作
5. **P2**：Git 操作

### 开发顺序
1. 先实现安全保障，再实现执行能力
2. 先实现简单工具，再实现复杂工具
3. 先实现本地操作，再实现远程操作

### 测试策略
1. 每个执行器都要有单元测试
2. 每个安全模块都要有集成测试
3. 整体系统要有端到端测试
