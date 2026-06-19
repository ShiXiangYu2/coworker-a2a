# Operator Console 只读导航协议

## 目标

本文档定义 `Operator Console` 中 `Overview`、`Task Flow` 与 `Runtime` 三个一级视图之间的只读定位规则。

该协议只用于页面跳转、过滤和高亮，不触发执行，不改变任务、AgentRun、RuntimeJob、RuntimeReceipt 或 AuditEvent 的状态。

## 一级视图锚点

当前 `/operator` 页面保留以下一级锚点：

- `#overview`：总览 Overview
- `#task-flow`：任务流 Task Flow
- `#runtime`：运行态 Runtime
- `#governance`：治理账本 Governance Ledger

锚点只用于页面定位，不代表执行动作。

## URL 参数

### taskFlowTaskId

用途：在 `Task Flow` 区域中高亮指定任务流。

示例：

```text
/operator?taskFlowTaskId=<taskId>#task-flow
```

约束：

- 只用于任务流高亮。
- 不触发任务分配、认领、运行、重试、审批或完成。
- 不请求 mutation API。

### runtimeTaskId

用途：在 `Runtime` 区域中展示指定任务的 Sprint 22 运行态只读视图。

示例：

```text
/operator?runtimeTaskId=<taskId>#runtime
```

约束：

- 只用于读取单任务运行态记录。
- 不触发 runtime claim、run、retry、complete。
- 不签发 token，不连接 connector，不启动 worker。

### taskFlowNodeId

用途：在 `Task Flow` 区域中高亮指定任务流节点。

示例：

```text
/operator?taskFlowTaskId=<taskId>&taskFlowNodeId=<nodeId>#task-flow
```

约束：

- 必须依附 `taskFlowTaskId` 使用。
- 只用于节点级只读定位与高亮。
- 不触发节点执行、审批、重试或状态变更。

### runtimeSection

用途：在 `Runtime` 区域中高亮指定只读区块。

当前允许值：

- `summary`
- `latest-receipt`
- `blocked-signal`

示例：

```text
/operator?runtimeTaskId=<taskId>&runtimeSection=latest-receipt#runtime
```

约束：

- 必须依附 `runtimeTaskId` 使用。
- 只用于区块级只读定位与弱高亮。
- 不触发运行态执行、重试、恢复或完成。

## Read Model Navigation Metadata

结构化 read model 中的导航字段只表达“可定位到哪里”，不表达“要执行什么”。

### taskFlowHref

```text
/operator?taskFlowTaskId=<taskId>#task-flow
```

用于定位并高亮对应任务流。

### runtimeHref

```text
/operator?runtimeTaskId=<taskId>#runtime
```

用于定位到对应任务的运行态只读视图。

## 节点级 Navigation Metadata

Task Flow 节点可附带更细粒度的只读导航信息：

- `taskFlowHref`
- `runtimeHref`
- `runtimeSection`

典型形式：

```text
/operator?taskFlowTaskId=<taskId>&taskFlowNodeId=<nodeId>#task-flow
/operator?runtimeTaskId=<taskId>&runtimeSection=summary#runtime
/operator?runtimeTaskId=<taskId>&runtimeSection=latest-receipt#runtime
/operator?runtimeTaskId=<taskId>&runtimeSection=blocked-signal#runtime
```

## Overview 链接规则

### Active Runtime

- 必须提供 `taskFlowHref`。
- 必须提供 `runtimeHref`。
- 链接文案建议使用“查看任务流”和“查看运行态”。

### Blocked Summary

- 必须提供 `taskFlowHref`。
- 当 blocked 信号来自 `runtime_job` 或 lifecycle repair 时，可以提供 `runtimeHref`。
- 不提供任何 retry、repair、approve 或 complete 操作。

### Recent Receipts

- 必须提供 `taskFlowHref`。
- 必须提供 `runtimeHref`。
- Receipt 链接只用于查看上下文，不用于重放或补偿执行。

## Sprint 22 只读安全边界

当前允许：

- 查看结构化 read model。
- 查看 runtime 只读状态。
- 查看 audit、evidence、workflow、receipt 摘要。
- 通过 URL 参数和 hash 在页面中定位。
- 对目标任务流做只读高亮。

当前禁止：

- 新增 mutation API。
- 真实执行 Agent、Tool、Workflow 或 RuntimeJob。
- 自动路由、自动分配、自动推进任务状态。
- `claim`、`run`、`complete`、`retry`、`approve` 等 UI 操作。
- worker、token issuance、connector 控制。
- 轮询、SSE、自动刷新。
- 修改底层状态机或数据库 schema。

## 后续扩展预留

当前已支持：

- `taskFlowNodeId`：定位到 Task Flow 中的某个节点。
- `runtimeSection`：定位到 Runtime 区域中的摘要、receipt 或 blocked signal 区块。

后续如果继续扩展，仍必须保持只读：参数只能用于过滤、定位和高亮，不能触发执行。
