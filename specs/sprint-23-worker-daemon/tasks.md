# Sprint 23 — Worker Daemon 任务拆分

## 任务概览

| 任务 | 描述 | 预估 | 依赖 | 状态 |
|------|------|------|------|------|
| T1 | 数据模型（Prisma schema 扩展） | 1h | 无 | ⬜ |
| T2 | 数据仓库（repository.ts） | 2h | T1 | ⬜ |
| T3 | 类型定义（types.ts） | 0.5h | 无 | ⬜ |
| T4 | ExecutionWorker 核心类 | 3h | T2, T3 | ⬜ |
| T5 | 启动脚本（worker-start.ts） | 0.5h | T4 | ⬜ |
| T6 | 超时回收定时任务 | 1h | T2 | ⬜ |
| T7 | 单元测试 | 2h | T2, T4 | ⬜ |
| T8 | 集成验证 | 1h | T5, T6, T7 | ⬜ |

**总预估**：11h

---

## T1：数据模型（Prisma schema 扩展）

### 描述

在 `prisma/schema.prisma` 中新增三个模型：

- `WorkerInstance`：Worker 注册表
- `TaskQueueJob`：任务队列
- `WorkerHeartbeat`：心跳记录

### 具体工作

1. 在 schema.prisma 中添加三个 model 定义（参考 plan.md 第一节）
2. 运行 `npx prisma db push` 生成数据库表
3. 运行 `npx prisma generate` 生成 Prisma Client

### 验收标准

- [ ] `npx prisma validate` 通过
- [ ] `npx prisma db push` 成功
- [ ] 数据库中出现 `worker_instances`、`task_queue_jobs`、`worker_heartbeats` 三张表
- [ ] Prisma Client 类型正确生成

### 文件变更

- `prisma/schema.prisma`（修改）

---

## T2：数据仓库（repository.ts）

### 描述

实现 TaskQueueJob 和 WorkerInstance 的数据库操作层。

### 具体工作

1. 创建 `src/lib/worker/repository.ts`
2. 实现以下方法：

```typescript
// TaskQueueJob 操作
findPendingJobs(input: { capabilities: string[], limit: number }): Promise<QueueJobRecord[]>
tryLeaseJob(input: { jobId: string, workerId: string, leaseDurationMs: number }): Promise<QueueJobRecord | null>
updateJobStatus(jobId: string, status: QueueJobStatus): Promise<void>
completeJob(jobId: string, result: { status, summary, durationMs }): Promise<void>
failJob(jobId: string, error: Record<string, unknown>): Promise<void>
requeueJob(jobId: string, input: { retryCount, lastError }): Promise<void>
deadLetterJob(jobId: string, input: { lastError }): Promise<void>
reclaimExpiredLeases(): Promise<number>

// WorkerInstance 操作
registerWorker(input: { workerId, capabilities, maxConcurrent }): Promise<void>
deregisterWorker(workerId: string): Promise<void>
updateHeartbeat(input: { workerId, status, metrics }): Promise<void>
findOnlineWorkers(): Promise<WorkerInstance[]>
```

3. 实现 `createTaskQueueJob` 用于入队任务

### 验收标准

- [ ] 所有方法可正常调用
- [ ] `tryLeaseJob` 使用 CAS 更新（WHERE status='pending'）
- [ ] `reclaimExpiredLeases` 正确回收过期 Lease
- [ ] 幂等键防重复入队

### 文件变更

- `src/lib/worker/repository.ts`（新建）
- `src/lib/worker/index.ts`（新建，re-export）

---

## T3：类型定义（types.ts）

### 描述

定义 Worker 模块的所有 TypeScript 接口和类型。

### 具体工作

1. 创建 `src/lib/worker/types.ts`
2. 定义以下类型（参考 plan.md 第二节）：

```typescript
WorkerCapability, WorkerStatus, QueueJobStatus, QueuePriority
WorkerConfig, WorkerRuntimeState
QueueJobRecord, JobExecutionResult
WorkerEvent（联合类型）
```

### 验收标准

- [ ] 类型定义完整，无 any
- [ ] 与 Prisma 生成的类型兼容

### 文件变更

- `src/lib/worker/types.ts`（新建）

---

## T4：ExecutionWorker 核心类

### 描述

实现 Worker Daemon 的核心类，包含主循环、Lease 认领、异步执行、心跳上报。

### 具体工作

1. 创建 `src/lib/worker/execution-worker.ts`
2. 实现 `ExecutionWorker` 类：

```typescript
class ExecutionWorker {
  constructor(config: WorkerConfig)
  
  // 生命周期
  async start(): Promise<void>
  async stop(reason?: string): Promise<void>
  
  // 主循环
  private async pollAndExecute(): Promise<void>
  
  // 任务认领
  private async findLeasableJobs(limit: number): Promise<QueueJobRecord[]>
  private async leaseJob(job: QueueJobRecord): Promise<QueueJobRecord | null>
  
  // 任务执行
  private async executeJobAsync(job: QueueJobRecord): Promise<void>
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T>
  
  // 心跳
  private async sendHeartbeat(): Promise<void>
  
  // 超时回收（静态方法）
  static async reapExpiredLeases(repository: WorkerRepository): Promise<number>
  
  // 工具方法
  private emit(event: WorkerEvent): void
  private updateAvgDuration(newDuration: number): void
}
```

3. 任务执行先用 mock 实现（返回固定结果），后续再接入真实 Agent Runtime

### 验收标准

- [ ] Worker 可以启动和停止
- [ ] 主循环每 5 秒执行一次
- [ ] 心跳每 30 秒更新一次
- [ ] 收到 SIGTERM 后优雅关闭
- [ ] mock 任务可以成功执行

### 文件变更

- `src/lib/worker/execution-worker.ts`（新建）

---

## T5：启动脚本（worker-start.ts）

### 描述

创建 Worker 的独立启动脚本。

### 具体工作

1. 创建 `scripts/worker-start.ts`
2. 解析环境变量：

```bash
WORKER_ID=worker-dev-1
WORKER_CAPABILITIES=sandbox
WORKER_MAX_CONCURRENT=1
WORKER_POLL_INTERVAL_MS=5000
WORKER_HEARTBEAT_MS=30000
WORKER_LEASE_MS=120000
WORKER_JOB_TIMEOUT_MS=60000
```

3. 注册 SIGTERM/SIGINT 处理器
4. 启动 Worker

### 验收标准

- [ ] `npx tsx scripts/worker-start.ts` 可以启动
- [ ] 日志输出 Worker 启动信息
- [ ] Ctrl+C 优雅关闭

### 文件变更

- `scripts/worker-start.ts`（新建）

---

## T6：超时回收定时任务

### 描述

实现独立的超时回收机制，检测过期 Lease 并重新入队。

### 具体工作

1. 创建 `src/lib/worker/reaper.ts`
2. 实现 `reapExpiredLeases` 函数：
   - 查询 status IN ('assigned', 'running') AND leaseExpiresAt < NOW()
   - 对每个超时任务：
     - 如果 retryCount < maxRetries → requeue
     - 如果 retryCount >= maxRetries → dead_letter
   - 记录审计日志
3. 可以作为独立脚本运行，也可以集成到 Worker 主循环

### 验收标准

- [ ] 过期 Lease 被正确回收
- [ ] 重试次数递增
- [ ] 重试耗尽进入死信

### 文件变更

- `src/lib/worker/reaper.ts`（新建）
- `scripts/worker-reap.ts`（新建，可选）

---

## T7：单元测试

### 描述

为 Worker 模块编写单元测试。

### 具体工作

1. 创建 `src/lib/worker/__tests__/repository.test.ts`：
   - 测试 findPendingJobs
   - 测试 tryLeaseJob（CAS 成功和失败）
   - 测试 completeJob
   - 测试 requeueJob
   - 测试 reclaimExpiredLeases

2. 创建 `src/lib/worker/__tests__/execution-worker.test.ts`：
   - 测试 Worker 启动和停止
   - 测试主循环 pollAndExecute
   - 测试心跳上报
   - 测试优雅关闭

3. 创建 `src/lib/worker/__tests__/reaper.test.ts`：
   - 测试超时回收
   - 测试死信队列

### 验收标准

- [ ] 所有测试通过
- [ ] 覆盖率 > 80%

### 文件变更

- `src/lib/worker/__tests__/repository.test.ts`（新建）
- `src/lib/worker/__tests__/execution-worker.test.ts`（新建）
- `src/lib/worker/__tests__/reaper.test.ts`（新建）

---

## T8：集成验证

### 描述

端到端验证 Worker Daemon 的完整流程。

### 具体工作

1. 创建 `scripts/worker-integration-test.ts`：
   - 入队一个 mock 任务
   - 启动 Worker
   - 等待 Worker 执行完成
   - 验证任务状态变为 completed
   - 停止 Worker

2. 手动测试：
   - 启动 Worker
   - 通过 API 入队任务
   - 观察 Worker 日志
   - 验证任务执行结果

### 验收标准

- [ ] 端到端流程跑通
- [ ] 日志清晰可读
- [ ] 无内存泄漏

### 文件变更

- `scripts/worker-integration-test.ts`（新建）

---

## 依赖关系图

```
T1（数据模型）
├── T2（数据仓库）
│   ├── T4（ExecutionWorker）
│   │   ├── T5（启动脚本）
│   │   └── T7（单元测试）
│   └── T6（超时回收）
└── T3（类型定义）
    └── T4（ExecutionWorker）

T5 + T6 + T7 → T8（集成验证）
```

## 执行顺序建议

1. **T1 + T3**（并行）：数据模型 + 类型定义
2. **T2**：数据仓库
3. **T4 + T6**（并行）：ExecutionWorker + 超时回收
4. **T5**：启动脚本
5. **T7**：单元测试
6. **T8**：集成验证
