# Sprint 23 — Worker Daemon 基础

## 产品需求文档（PRD）

### 背景

Sprint 1-22 建立了完整的 Agent 治理框架，但系统运行模式是**请求-响应**：用户发消息 → Agent 同步处理 → 返回结果。这意味着：

- 用户必须在线等待结果
- 无法处理耗时长的任务（如代码审查、多步执行）
- 无法在后台持续运行任务
- 无法实现任务队列和优先级调度

Sprint 23 的目标是引入 **Worker Daemon**，让系统从"同步请求-响应"升级为"异步持续执行"。

### 目标

1. **TaskQueue**：任务入队后异步执行，支持优先级排序
2. **ExecutionWorker**：持续运行的守护进程，自动扫描队列、认领任务、执行、上报
3. **Lease 机制**：防止多个 Worker 重复执行同一任务
4. **心跳上报**：Worker 定期报告存活状态和运行指标
5. **超时回收**：检测超时的 Lease，自动回收任务重新入队

### 非目标（Sprint 23 不做）

- ❌ 真实 Git/API/Deploy 执行（Sprint 24+）
- ❌ Docker/VM 沙箱隔离（保持现有 Node.js 进程模型）
- ❌ 分布式 Worker 调度（单机多 Worker 即可）
- ❌ 实时流式结果推送（保持轮询模式）
- ❌ Operator 控制台发起任务（Sprint 29+）

### 核心用户场景

#### 场景 1：异步任务执行

```
1. 用户在 ChatHub 发送消息："帮我审查这个 PR"
2. Agent Router 创建 HarmonyTask
3. 系统将任务入队 TaskQueueJob（priority=1, capabilities=['sandbox']）
4. Worker Daemon 扫描到任务，认领并执行
5. Worker 调用 Agent Runtime 执行多轮 Tool Use
6. 执行完成后，Worker 更新 TaskQueueJob status='completed'
7. 用户刷新 Operator Console 看到任务完成
```

#### 场景 2：优先级调度

```
1. 紧急任务入队（priority=0）
2. 普通任务入队（priority=2）
3. Worker 优先认领 priority=0 的任务
4. 紧急任务完成后，再处理普通任务
```

#### 场景 3：失败重试

```
1. Worker 执行任务失败
2. 如果 retryCount < maxRetries，任务重新入队（retryCount++）
3. 如果 retryCount >= maxRetries，任务进入死信队列
4. Operator 在治理账本中看到死信任务，人工介入
```

#### 场景 4：Worker 超时回收

```
1. Worker A 认领任务后崩溃
2. Lease 超时（120s 后）
3. 超时回收任务检测到过期 Lease
4. 任务状态从 'assigned' 恢复为 'pending'
5. Worker B 认领并重新执行
```

### 安全边界

1. **Worker 能力声明**：Worker 启动时声明支持的能力（sandbox/git/api/deploy），只能执行匹配的任务
2. **Lease 防重**：CAS 原子更新防止多个 Worker 同时认领
3. **超时强制回收**：防止 Worker 崩溃导致任务永久卡住
4. **死信队列**：重试耗尽的任务不再自动执行，需人工介入
5. **优雅关闭**：收到 SIGTERM 时等待当前任务完成，不丢弃执行中的任务
6. **审计日志**：所有 Worker 事件（启动/认领/执行/完成/失败/心跳）写入审计

### 验收标准

| 编号 | 验收项 | 验收方式 |
|------|--------|----------|
| AC-1 | Worker 可以独立启动和停止 | `npx tsx scripts/worker-start.ts` 启动，Ctrl+C 优雅关闭 |
| AC-2 | Worker 每 5 秒扫描队列 | 日志输出 poll 事件 |
| AC-3 | Worker 认领 pending 任务并执行 | 手动入队任务，Worker 自动执行 |
| AC-4 | Lease 机制防止重复认领 | 两个 Worker 同时扫描，只有一个认领成功 |
| AC-5 | 心跳每 30 秒更新 | 数据库 worker_heartbeats 表有记录 |
| AC-6 | 超时任务被回收 | 模拟 Worker 崩溃，120s 后任务重新 pending |
| AC-7 | 失败任务自动重试 | 模拟执行失败，retryCount 递增 |
| AC-8 | 重试耗尽进入死信 | 模拟连续失败 maxRetries 次，status='dead_letter' |
| AC-9 | 优雅关闭等待任务完成 | 执行中收到 SIGTERM，等待完成后退出 |
| AC-10 | 审计日志完整 | 所有 Worker 事件可查询 |

### 技术约束

- 使用 SQLite + Prisma（不引入 Redis/PostgreSQL）
- Worker 以 Node.js 进程运行（不引入 Docker）
- 与现有 RuntimeExecutionToken/Job/Receipt 模型衔接
- 与现有 Agent Runtime（turn-loop / orchestrator）衔接

### 演进路线

- Sprint 23：Worker Daemon 基础（本 PRD）
- Sprint 24：真实 Git 执行
- Sprint 25：真实 API 集成
- Sprint 26：质量闭环
- Sprint 27：部署能力
- Sprint 28：监控告警
- Sprint 29：Operator 控制
- Sprint 30：知识复用
