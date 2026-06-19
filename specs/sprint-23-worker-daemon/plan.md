# Sprint 23 — Worker Daemon 技术方案

## 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Task Queue Layer                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ TaskQueueJob │  │ WorkerInstance│  │WorkerHeartbeat│    │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Worker Layer                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │            ExecutionWorker                       │   │
│  │  - pollAndExecute() 主循环                       │   │
│  │  - leaseJob() Lease 认领                         │   │
│  │  - executeJobAsync() 异步执行                    │   │
│  │  - sendHeartbeat() 心跳上报                      │   │
│  │  - reapExpiredLeases() 超时回收                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                Execution Layer                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │Agent Runtime │  │ Tool Engine │  │  Sandbox     │    │
│  │(turn-loop)   │  │(engine.ts)  │  │(file-write)  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
└─────────────────────────────────────────────────────────┘
```

## 一、数据模型

### 1.1 WorkerInstance

```prisma
model WorkerInstance {
  id                String   @id
  workerId          String   @unique
  status            String   // online | offline | draining
  capabilitiesJson  String   // ["sandbox", "git", "api"]
  maxConcurrent     Int      @default(1)
  currentJobId      String?
  lastHeartbeatAt   DateTime
  startedAt         DateTime @default(now())
  stoppedAt         DateTime?

  @@index([status])
  @@index([lastHeartbeatAt])
  @@map("worker_instances")
}
```

### 1.2 TaskQueueJob

```prisma
model TaskQueueJob {
  id                     String   @id @default(cuid())
  idempotencyKey         String?  @unique
  taskId                 String
  correlationId          String
  priority               Int      @default(2)     // 0=紧急, 1=高, 2=普通, 3=低
  status                 String   @default("pending") // pending|assigned|running|completed|failed|dead_letter
  requiredCapabilitiesJson String @default("[]")
  requiredAgentRolesJson String   @default("[]")
  maxRetries             Int      @default(3)
  retryCount             Int      @default(0)
  timeoutMs              Int      @default(60000)
  scheduledAt            DateTime @default(now())
  assignedWorkerId       String?
  leaseExpiresAt         DateTime?
  lastErrorJson          String?
  attemptCount           Int      @default(0)
  startedAt              DateTime?
  completedAt            DateTime?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  @@index([status, priority])
  @@index([assignedWorkerId])
  @@index([taskId])
  @@index([scheduledAt])
  @@index([idempotencyKey])
  @@map("task_queue_jobs")
}
```

### 1.3 WorkerHeartbeat

```prisma
model WorkerHeartbeat {
  id          String   @id @default(cuid())
  workerId    String
  jobId       String?
  status      String   // idle | busy | draining
  metricsJson String   // {"activeJobs":0,"completedToday":5,"avgDurationMs":12000}
  createdAt   DateTime @default(now())

  @@index([workerId])
  @@index([createdAt])
  @@map("worker_heartbeats")
}
```

## 二、核心模块

### 2.1 类型定义

文件：`src/lib/worker/types.ts`

```typescript
export type WorkerCapability = 'sandbox' | 'git' | 'api' | 'deploy' | 'obsidian' | 'database'
export type WorkerStatus = 'online' | 'offline' | 'draining'
export type QueueJobStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'dead_letter'
export type QueuePriority = 0 | 1 | 2 | 3

export interface WorkerConfig {
  workerId: string
  capabilities: WorkerCapability[]
  maxConcurrent: number
  pollIntervalMs: number
  heartbeatIntervalMs: number
  leaseDurationMs: number
  jobTimeoutMs: number
}

export interface WorkerRuntimeState {
  config: WorkerConfig
  status: WorkerStatus
  activeJobIds: Set<string>
  completedToday: number
  failedToday: number
  avgDurationMs: number
  isShuttingDown: boolean
}
```

### 2.2 数据仓库

文件：`src/lib/worker/repository.ts`

核心方法：

```typescript
// 查找可认领任务
async function findPendingJobs(input: {
  capabilities: WorkerCapability[]
  limit: number
}): Promise<QueueJobRecord[]>

// CAS 原子认领
async function tryLeaseJob(input: {
  jobId: string
  workerId: string
  leaseDurationMs: number
}): Promise<QueueJobRecord | null>

// 标记完成
async function completeJob(jobId: string, result: {
  status: 'completed' | 'failed'
  summary: string
  durationMs: number
}): Promise<void>

// 重新入队
async function requeueJob(jobId: string, input: {
  retryCount: number
  lastError: Record<string, unknown>
}): Promise<void>

// 死信队列
async function deadLetterJob(jobId: string, input: {
  lastError: Record<string, unknown>
}): Promise<void>

// 超时回收
async function reclaimExpiredLeases(): Promise<number>
```

### 2.3 ExecutionWorker

文件：`src/lib/worker/execution-worker.ts`

核心循环伪代码：

```
class ExecutionWorker:
  start():
    1. 注册 Worker（INSERT worker_instances）
    2. 启动心跳定时器（每 30s）
    3. 启动主循环定时器（每 5s）

  pollAndExecute():
    1. 检查是否正在关闭 → return
    2. 检查活跃任务数 < maxConcurrent → return
    3. 查询 pending 任务（按优先级排序）
    4. 对每个任务：
       a. tryLeaseJob（CAS 更新）
       b. 成功 → executeJobAsync（异步）
       c. 失败 → 跳过（被其他 Worker 抢走）

  executeJobAsync(job):
    1. activeJobIds.add(job.id)
    2. UPDATE status = 'running'
    3. 加载任务上下文
    4. 选择 Agent
    5. 执行 Agent（带超时）
    6. 成功 → completeJob
    7. 失败 → requeueJob 或 deadLetterJob
    8. finally → activeJobIds.delete(job.id)

  sendHeartbeat():
    1. INSERT worker_heartbeats
    2. 更新 worker_instances.lastHeartbeatAt

  stop(reason):
    1. 停止主循环定时器
    2. status = 'draining'
    3. 等待 activeJobIds 清空（最多 30s）
    4. UPDATE worker_instances SET status='offline'
    5. 清除心跳定时器
```

### 2.4 启动脚本

文件：`scripts/worker-start.ts`

```
1. 解析环境变量（WORKER_ID, WORKER_CAPABILITIES, ...）
2. 创建 ExecutionWorker 实例
3. 注册 SIGTERM/SIGINT 处理器
4. 调用 worker.start()
5. 输出启动日志
```

## 三、Lease 机制

### 3.1 认领流程

```sql
-- CAS 原子更新
UPDATE task_queue_jobs
SET status = 'assigned',
    assignedWorkerId = '{workerId}',
    leaseExpiresAt = NOW() + {leaseDurationMs}ms,
    attemptCount = attemptCount + 1
WHERE id = '{jobId}'
  AND status = 'pending'
  AND scheduledAt <= NOW()
```

- 返回 affected rows = 1 → 认领成功
- 返回 affected rows = 0 → 被其他 Worker 抢走

### 3.2 超时回收

```sql
-- 定时任务（每 30s 执行一次）
UPDATE task_queue_jobs
SET status = 'pending',
    assignedWorkerId = NULL,
    leaseExpiresAt = NULL
WHERE status IN ('assigned', 'running')
  AND leaseExpiresAt < NOW()
```

### 3.3 时序图

```
Worker A              Task Queue             Worker B
   │                      │                     │
   │ 1. poll(pending)     │                     │
   │ ────────────────────>│                     │
   │                      │                     │
   │ 2. CAS UPDATE        │                     │
   │    status='assigned' │                     │
   │ <────────────────────│                     │
   │                      │                     │
   │ 3. execute...        │   4. poll(same)     │
   │    ...               │ <───────────────────│
   │    ...               │                     │
   │                      │  5. CAS fails       │
   │                      │  (status!='pending')│
   │                      │ ───────────────────>│
   │                      │                     │
   │ 6. complete          │                     │
   │    status='completed'│                     │
   │ ────────────────────>│                     │
```

## 四、优雅关闭

```
1. 收到 SIGTERM
2. 设置 isShuttingDown = true
3. 停止 pollAndExecute 定时器
4. status = 'draining'
5. 等待 activeJobIds 清空（最多 30s）
6. 超时则强制放弃
7. UPDATE worker_instances SET status='offline', stoppedAt=NOW()
8. 清除心跳定时器
9. process.exit(0)
```

## 五、监控指标

| 指标 | 来源 | 说明 |
|------|------|------|
| worker_count | worker_instances WHERE status='online' | 在线 Worker 数 |
| queue_depth | task_queue_jobs WHERE status='pending' | 队列深度 |
| active_jobs | WorkerRuntimeState.activeJobIds | 活跃任务数 |
| completed_today | WorkerRuntimeState.completedToday | 今日完成数 |
| failed_today | WorkerRuntimeState.failedToday | 今日失败数 |
| avg_duration | WorkerRuntimeState.avgDurationMs | 平均执行时长 |
| lease_reclaimed | 超时回收计数 | 被回收的 Lease 数 |

## 六、与现有模块衔接

| 现有模块 | 衔接方式 |
|----------|----------|
| `src/lib/runtime-execution/` | TaskQueueJob 可关联 RuntimeDispatchJob |
| `src/lib/agent-runtime/orchestrator.ts` | Worker 调用 orchestrator 执行多 Agent 任务 |
| `src/lib/agent-runtime/turn-loop.ts` | Worker 调用 turn-loop 执行单 Agent 多轮对话 |
| `src/lib/tools/engine.ts` | Worker 通过 engine 执行工具 |
| `src/lib/eval/` | 任务完成后可触发质量检查 |
| `src/lib/observability/` | Worker 事件写入 ObservabilityEvent |
| `scripts/runtime-run-once.ts` | Worker 是 run-once 的持续运行版本 |
