# Operator Console 只读定位验收清单

## 文档目标

本文档用于验收任务包 A/B/C/D/E1/E2 后的 `Operator Console` 只读治理与定位能力。

验收重点是确认 `/operator` 页面可以稳定查看结构化总览、任务流和运行态记录，并通过 URL 参数完成只读定位与弱高亮。本文档不定义任何执行能力，也不允许新增 mutation API、状态机改动、数据库字段或自动刷新机制。

## 验收项

### 1. `/operator` 四个一级视图

**验收目标**

确认 Operator Console 保留四个一级视图，并且导航只用于页面锚点定位。

**访问路径或 URL 示例**

```text
/operator
/operator#overview
/operator#task-flow
/operator#runtime
/operator#governance
```

**预期 UI 表现**

- 页面顶部展示 `Operator Console`。
- 一级导航包含：
  - `总览 Overview`
  - `任务流 Task Flow`
  - `运行态 Runtime`
  - `治理账本 Governance Ledger`
- `#overview`、`#task-flow`、`#runtime`、`#governance` 只定位页面区域。
- 页面展示 `v1 只读安全边界` 与本地治理说明。

**不应出现的执行入口**

- 不应出现执行按钮。
- 不应出现 claim、run、complete、retry、approve 类操作。
- 不应通过锚点触发 API mutation。

**相关测试或代码文件**

- `src/app/operator/page.tsx`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 2. Overview 结构化只读总览

**验收目标**

确认 Overview 通过结构化只读 API 展示总览数据，不再由前端拼装多个旧接口。

**访问路径或 URL 示例**

```text
/operator#overview
GET /api/operator/overview?limit=5
```

**预期 UI 表现**

- Overview 展示 `Active Runtime`、`Blocked Summary`、`Recent Receipts`。
- 展示只读安全提示：Overview 只渲染派生状态，不改变执行状态。
- 空状态清楚说明暂无对应记录。
- 错误状态只展示读取失败原因，不提供修复或重试执行入口。

**不应出现的执行入口**

- 不应出现 `<button` 形式的执行控制。
- 不应请求 `/api/conversations`、`/api/harmony/tasks`、`/api/audit/agent-runs`、`/api/tool-calls`、`/api/eval-runs`、`/api/workflow-proposals` 作为 Overview 拼装来源。
- 不应出现 `/claim`、`/run-once`、`/complete`、`/retry`、`/approve`。

**相关测试或代码文件**

- `src/components/operator-console/operator-overview.tsx`
- `src/lib/operator-console/overview-read-model.ts`
- `src/app/api/operator/overview/route.ts`
- `src/lib/operator-console/__tests__/overview-read-model.test.ts`
- `src/app/api/operator/overview/__tests__/route.test.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 3. Task Flow 结构化任务流

**验收目标**

确认 Task Flow 从结构化 read model 读取任务流节点，不再解析 assistant 文本。

**访问路径或 URL 示例**

```text
/operator#task-flow
GET /api/operator/task-flows?limit=5
```

**预期 UI 表现**

- Task Flow 展示最近结构化任务流。
- 每个 flow 展示 task、agent_run、workflow、runtime_job、runtime_receipt、audit 等节点。
- flow 顶部展示任务级只读定位链接。
- runtime job 或 runtime receipt 节点可展示“查看运行态区块”只读链接。
- 视图说明包含“本视图只读”。

**不应出现的执行入口**

- 不应解析 assistant 文本作为步骤来源。
- 不应出现 `extractSteps` 或 assistant 文本解析逻辑。
- 不应出现 claim、retry、approve、complete 操作。
- 不应出现执行型 `onClick`。

**相关测试或代码文件**

- `src/components/operator-console/multi-agent-flow.tsx`
- `src/lib/operator-console/task-flow-read-model.ts`
- `src/app/api/operator/task-flows/route.ts`
- `src/lib/operator-console/__tests__/task-flow-read-model.test.ts`
- `src/app/api/operator/task-flows/__tests__/route.test.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 4. Runtime 单任务只读视图

**验收目标**

确认 Runtime 区域仅通过任务 ID 展示 Sprint 22 单任务运行态只读记录。

**访问路径或 URL 示例**

```text
/operator#runtime
/operator?runtimeTaskId=<taskId>#runtime
GET /api/tasks/<taskId>/runtime-operator-view
```

**预期 UI 表现**

- 未提供 `runtimeTaskId` 时，展示最近任务的只读运行态视图或空状态。
- 提供 `runtimeTaskId` 时，展示该任务的 runtime summary、status bands、latest job、latest receipt。
- 展示 lifecycle phase、primary status、live/succeeded/blocked/failed 状态带。
- 安全提示说明不暴露 mutation、worker、token issuance 或 connector 控制。

**不应出现的执行入口**

- 不应出现 runtime claim、start、run-once、complete-dry-run、complete-obsidian-write。
- 不应出现 worker、token issuance、connector 控制。
- 不应出现任何执行按钮。

**相关测试或代码文件**

- `src/components/operator-console/runtime-execution-panel.tsx`
- `src/lib/runtime-execution/operator-view-model.ts`
- `src/lib/runtime-execution/task-summary.ts`
- `src/app/api/tasks/[id]/runtime-operator-view/route.ts`
- `src/lib/runtime-execution/__tests__/operator-view-model.test.ts`
- `src/lib/runtime-execution/__tests__/task-summary.test.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 5. `taskFlowTaskId` 任务级定位

**验收目标**

确认通过 `taskFlowTaskId` 可以在 Task Flow 区域高亮对应任务流。

**访问路径或 URL 示例**

```text
/operator?taskFlowTaskId=<taskId>#task-flow
```

**预期 UI 表现**

- 页面定位到 Task Flow 区域。
- 命中的 flow 显示任务级弱高亮。
- 命中的 flow 显示 `当前定位任务`。
- 未命中时不触发执行，不报错中断页面。

**不应出现的执行入口**

- `taskFlowTaskId` 不应触发任务认领、运行、重试、审批或完成。
- 不应请求 mutation API。

**相关测试或代码文件**

- `src/app/operator/page.tsx`
- `src/components/operator-console/multi-agent-flow.tsx`
- `src/lib/operator-console/task-flow-read-model.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 6. `taskFlowNodeId` 节点级定位

**验收目标**

确认通过 `taskFlowNodeId` 可以在指定任务流内高亮某个节点。

**访问路径或 URL 示例**

```text
/operator?taskFlowTaskId=<taskId>&taskFlowNodeId=<nodeId>#task-flow
```

**预期 UI 表现**

- 页面定位到 Task Flow 区域。
- 对应 flow 保持任务级高亮。
- 命中的节点显示节点级弱高亮。
- 命中的节点显示 `当前定位节点`。
- runtime job / runtime receipt 节点可展示“查看运行态区块”只读链接。

**不应出现的执行入口**

- `taskFlowNodeId` 不应触发节点执行、审批、重试或状态变更。
- 不应出现节点操作菜单。
- 不应出现执行按钮。

**相关测试或代码文件**

- `src/app/operator/page.tsx`
- `src/components/operator-console/multi-agent-flow.tsx`
- `src/lib/operator-console/task-flow-read-model.ts`
- `src/lib/operator-console/__tests__/task-flow-read-model.test.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 7. `runtimeTaskId` 单任务运行态定位

**验收目标**

确认通过 `runtimeTaskId` 可以定位到 Runtime 区域并展示指定任务的只读运行态。

**访问路径或 URL 示例**

```text
/operator?runtimeTaskId=<taskId>#runtime
```

**预期 UI 表现**

- 页面定位到 Runtime 区域。
- “运行态任务过滤”说明当前正在查看指定任务。
- Runtime 面板读取指定任务的 `runtime-operator-view`。
- 只展示 summary、status bands、latest job、latest receipt 等只读内容。

**不应出现的执行入口**

- `runtimeTaskId` 不应触发 runtime claim、run、retry、complete。
- 不应签发 token。
- 不应连接 connector。

**相关测试或代码文件**

- `src/app/operator/page.tsx`
- `src/components/operator-console/runtime-execution-panel.tsx`
- `src/app/api/tasks/[id]/runtime-operator-view/route.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 8. `runtimeSection=summary` 区块级定位

**验收目标**

确认 Runtime 区域支持只读高亮 summary 区块。

**访问路径或 URL 示例**

```text
/operator?runtimeTaskId=<taskId>&runtimeSection=summary#runtime
```

**预期 UI 表现**

- 页面定位到 Runtime 区域。
- 指定任务运行态只读视图正常展示。
- 主状态 / summary 区块出现弱高亮。
- 展示 `当前定位到运行态摘要区块`。

**不应出现的执行入口**

- 不应因为 summary 定位触发运行态状态流转。
- 不应出现执行按钮或 mutation route。

**相关测试或代码文件**

- `src/app/operator/page.tsx`
- `src/components/operator-console/runtime-execution-panel.tsx`
- `src/lib/operator-console/task-flow-read-model.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

### 9. `runtimeSection=latest-receipt` 区块级定位

**验收目标**

确认 Runtime 区域支持只读高亮 latest receipt 相关区块。

**访问路径或 URL 示例**

```text
/operator?runtimeTaskId=<taskId>&runtimeSection=latest-receipt#runtime
```

**预期 UI 表现**

- 页面定位到 Runtime 区域。
- 最新 Job 明细 / latest receipt 区块出现弱高亮。
- 展示 `当前定位到最新 receipt 区块`。
- 从 Overview 的 Recent Receipts 或 Task Flow 的 receipt 节点进入时，应带上该参数。

**不应出现的执行入口**

- 不应触发 receipt 重放、补偿执行、恢复或重试。
- 不应出现 replay、retry、complete 类操作。

**相关测试或代码文件**

- `src/components/operator-console/runtime-execution-panel.tsx`
- `src/lib/operator-console/task-flow-read-model.ts`
- `src/lib/operator-console/overview-read-model.ts`
- `src/lib/operator-console/__tests__/task-flow-read-model.test.ts`
- `src/lib/operator-console/__tests__/overview-read-model.test.ts`

### 10. `runtimeSection=blocked-signal` 区块级定位

**验收目标**

确认 Runtime 区域支持只读高亮 blocked signal 区块。

**访问路径或 URL 示例**

```text
/operator?runtimeTaskId=<taskId>&runtimeSection=blocked-signal#runtime
```

**预期 UI 表现**

- 页面定位到 Runtime 区域。
- Blocked 状态列出现弱高亮。
- 展示 `当前定位到 blocked signal 区块`。
- 从 Overview 的 Blocked Summary 中 runtime_job blocked/failed 项进入时，应带上该参数。

**不应出现的执行入口**

- 不应触发 repair、retry、resume、rollback。
- 不应自动推进任务状态。
- 不应出现执行、修复或审批按钮。

**相关测试或代码文件**

- `src/components/operator-console/runtime-execution-panel.tsx`
- `src/lib/operator-console/overview-read-model.ts`
- `src/lib/operator-console/task-flow-read-model.ts`
- `src/lib/operator-console/__tests__/overview-read-model.test.ts`
- `src/components/operator-console/__tests__/operator-console.test.ts`

## 禁止出现的 mutation / 执行入口清单

### 禁止的 UI 操作

- Claim
- Run
- Run Once
- Start
- Execute
- Complete
- Retry
- Replay
- Repair
- Rollback
- Restore
- Resume
- Approve execution
- Grant permission
- Request permission
- Assign runtime agent
- Connect MCP
- Issue token
- Deploy
- Publish
- Release

### 禁止的 API 或路由形态

- `/api/runtime/jobs/claim`
- `/api/runtime/jobs/[id]/start`
- `/api/runtime/jobs/[id]/run-once`
- `/api/runtime/jobs/[id]/complete-dry-run`
- `/api/runtime/jobs/[id]/complete-obsidian-write`
- `/api/runtime/jobs/[id]/recovery`
- `/api/runtime/tokens`
- `/api/tool-runs/execute-approved`
- 任何新增 mutation API
- 任何通过 URL 参数触发写操作的 API

### 禁止的行为

- 自动执行 Agent、Tool、Workflow 或 RuntimeJob。
- 自动路由或自动分配任务。
- 自动推进 task 到 completed。
- 写文件、运行 Git 写操作、部署或发布。
- 调用外部 API 或连接 MCP。
- 引入轮询、SSE、自动刷新。
- 修改状态机或数据库 schema。

## 手工 smoke test 推荐顺序

1. 打开 `/operator`，确认四个一级视图与 `v1 只读安全边界` 正常展示。
2. 查看 `/operator#overview`，确认 Overview 加载结构化总览，并展示 Active Runtime、Blocked Summary、Recent Receipts。
3. 在 Overview 中点击任意“查看任务流”，确认跳转到 `#task-flow`，且 URL 包含 `taskFlowTaskId`。
4. 如果链接来自 runtime job 或 receipt，确认 URL 同时包含 `taskFlowNodeId`，Task Flow 中对应节点显示 `当前定位节点`。
5. 在 Overview 中点击任意“查看运行态”，确认跳转到 `#runtime`，且 URL 包含 `runtimeTaskId`。
6. 从 Active Runtime 进入 Runtime，确认 URL 包含 `runtimeSection=summary`，summary 区块弱高亮。
7. 从 Recent Receipts 进入 Runtime，确认 URL 包含 `runtimeSection=latest-receipt`，最新 receipt 区块弱高亮。
8. 从 Blocked Summary 的 runtime blocked/failed 项进入 Runtime，确认 URL 包含 `runtimeSection=blocked-signal`，Blocked 区块弱高亮。
9. 直接访问 `/operator?taskFlowTaskId=<taskId>#task-flow`，确认只做任务级高亮。
10. 直接访问 `/operator?taskFlowTaskId=<taskId>&taskFlowNodeId=<nodeId>#task-flow`，确认只做节点级高亮。
11. 直接访问 `/operator?runtimeTaskId=<taskId>&runtimeSection=summary#runtime`，确认只做 summary 高亮。
12. 直接访问 `/operator?runtimeTaskId=<taskId>&runtimeSection=latest-receipt#runtime`，确认只做 latest receipt 高亮。
13. 直接访问 `/operator?runtimeTaskId=<taskId>&runtimeSection=blocked-signal#runtime`，确认只做 blocked signal 高亮。
14. 全程检查页面不出现执行按钮、mutation 操作入口、自动刷新或外部连接提示。

## 自动化验证建议

建议每次修改 Operator Console 只读定位能力后运行：

```powershell
npx vitest run src/lib/operator-console/__tests__/task-flow-read-model.test.ts src/lib/operator-console/__tests__/overview-read-model.test.ts src/components/operator-console/__tests__/operator-console.test.ts
npm run lint
npm run build
```

## Sprint 22 只读边界确认

当前只读定位能力只允许：

- 读取结构化 read model。
- 使用 URL 参数定位任务、节点或区块。
- 使用 hash 定位页面一级区域。
- 使用弱高亮提示当前定位对象。
- 查看 runtime 只读摘要、receipt、blocked signal。

当前只读定位能力不允许：

- 写入状态。
- 发起执行。
- 创建真实 runtime job。
- 修改数据库 schema。
- 新增 mutation API。
- 通过 UI 控制 worker、token、connector。
