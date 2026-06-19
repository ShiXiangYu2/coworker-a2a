# Operator Console 只读定位手工 Smoke Test 执行记录模板

## 文档目标

本文档用于记录 `Operator Console` 只读定位能力的手工 smoke test 执行结果。测试范围以 [docs/operator-console-readonly-navigation-smoke-checklist.md](D:/AI编程/产品自研/AI%20生产系统/coworker-a2a/docs/operator-console-readonly-navigation-smoke-checklist.md) 为准，重点验证：

- 只读治理视图是否可访问
- 结构化 Overview / Task Flow / Runtime 是否正确展示
- `taskFlowTaskId` / `taskFlowNodeId` / `runtimeTaskId` / `runtimeSection` 是否只触发定位与高亮
- 页面中是否严格不出现 mutation 或执行入口

本文档是首轮 smoke test 执行版报告模板。已根据当前仓库测试数据补入推荐样例 `taskId / nodeId / URL`，但默认仍保持“未执行”，实际结果需在本地服务启动后由执行人补充。

---

## 执行前准备

### 1. 本地服务地址

- 前端地址：`http://localhost:3000`
- Operator Console 地址：`http://localhost:3000/operator`

如本地端口不同，请在执行前记录实际地址：

- 实际前端地址：`http://127.0.0.1:3000`
- 实际 Operator Console 地址：`http://127.0.0.1:3000/operator`

### 2. 需要的样例 taskId / nodeId

建议优先使用当前测试中已经出现的样例：

- 可展示 Task Flow 的 `taskId`：`task-1`
- 可展示 runtime summary 的 `taskId`：`task-1`
- 可展示 recent receipt 的 `taskId`：`task-1`
- 可展示 blocked signal 的 `taskId`：`task-2`
- 对应 runtime job `nodeId`：`runtime-job-1`
- 对应 runtime receipt `nodeId`：`receipt-1`
- 对应 blocked runtime job `nodeId`：`runtime-job-2`

首轮本地实际数据：

- 实际可展示 Task Flow 的 `taskId`：`cmqkqbe440000azd0j3hp48xk`
- 实际可展示 runtime summary 的 `taskId`：`cmqkqbe440000azd0j3hp48xk`
- 实际可展示 recent receipt 的 `taskId`：`待运行本地服务后补充，当前本地数据无 runtime receipt`
- 实际可展示 blocked signal 的 `taskId`：`待运行本地服务后补充，当前本地数据无 blocked runtime job`
- 实际可用 task 节点 `nodeId`：`cmqkqbe440000azd0j3hp48xk`
- 实际可用 runtime job `nodeId`：`待运行本地服务后补充，当前本地数据无 runtime job`
- 实际可用 runtime receipt `nodeId`：`待运行本地服务后补充，当前本地数据无 runtime receipt`
- 实际可用 blocked runtime job `nodeId`：`待运行本地服务后补充，当前本地数据无 blocked runtime job`

补充说明：

- `task-1` 来自 task flow / overview read model 测试中的 active runtime 样例。
- `task-2` 来自 overview read model 测试中的 blocked runtime 样例。
- 如果本地实际数据集中不存在这些 ID，应标记为“待运行本地服务后补充”，并替换为本地真实样例。

### 3. 推荐先运行的自动化测试

```powershell
npx vitest run src/lib/operator-console/__tests__/task-flow-read-model.test.ts src/lib/operator-console/__tests__/overview-read-model.test.ts src/components/operator-console/__tests__/operator-console.test.ts
npm run lint
npm run build
```

执行记录：

- 自动化测试执行时间：`本轮未重新运行专项测试，先执行 HTTP/API smoke 验证`
- 自动化测试结果：`待补充`

---

## 失败问题分级

### P0：破坏只读安全边界

满足以下任一条件即判定为 `P0`：

- 页面出现真实执行入口
- 页面触发 mutation API
- 页面触发 claim / run / complete / retry / approve
- 页面可控制 worker / token / connector
- URL 参数触发写操作

### P1：定位或高亮错误

满足以下任一条件即判定为 `P1`：

- `taskFlowTaskId` 未命中正确任务流
- `taskFlowNodeId` 未命中正确节点
- `runtimeTaskId` 未命中正确任务
- `runtimeSection` 未命中正确区块
- 链接 URL 参数错误或 hash 错误
- 高亮位置错误或缺失

### P2：文案、布局或空状态问题

满足以下任一条件即判定为 `P2`：

- 文案不清晰
- 空状态或错误状态不合理
- 移动端/桌面布局有明显问题
- 只读边界提示不够明确

---

## Smoke Test 执行记录

### T-01 `/operator` 四个一级视图

- 测试编号：`T-01`
- 测试目标：确认 `/operator` 四个一级视图与页面级只读边界正常展示
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator`
  2. 检查顶部标题、一级导航和只读边界文案
  3. 点击 `#overview`、`#task-flow`、`#runtime`、`#governance` 对应锚点
- 预期结果：
  - 展示 `Operator Console`
  - 展示四个一级视图
  - 展示 `v1 只读安全边界`
  - 锚点只做页面定位
- 实际结果：`通过 HTTP 访问 http://127.0.0.1:3000/operator 返回 200；HTML 中可确认 Operator Console、总览 Overview、任务流 Task Flow、运行态 Runtime、治理账本 Governance Ledger 与 v1 只读安全边界均存在。`
- 通过状态：`通过`
- 问题记录：`无`
- 相关文件或测试：
  - `src/app/operator/page.tsx`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-02 Overview 结构化只读总览

- 测试编号：`T-02`
- 测试目标：确认 Overview 通过结构化 read model 展示总览
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator#overview`
  2. 检查 Active Runtime / Blocked Summary / Recent Receipts
  3. 检查空状态、错误状态与只读说明
- 预期结果：
  - Overview 正常加载
  - 展示只读安全说明
  - 不依赖旧多接口拼装
- 实际结果：`GET http://127.0.0.1:3000/api/operator/overview?limit=5 返回 ok=true；当前本地数据包含 1 个 task flow，Active Runtime / Blocked Summary / Recent Receipts 均为空，符合当前无 runtime job / receipt 的数据状态。`
- 通过状态：`通过`
- 问题记录：`无`
- 相关文件或测试：
  - `src/components/operator-console/operator-overview.tsx`
  - `src/lib/operator-console/overview-read-model.ts`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-03 Task Flow 结构化任务流

- 测试编号：`T-03`
- 测试目标：确认 Task Flow 展示结构化任务流与只读节点
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator#task-flow`
  2. 检查 flow 卡片、节点类型和只读定位链接
- 预期结果：
  - 展示结构化任务流
  - 节点类型清晰
  - 本视图只读
  - 不解析 assistant 文本
- 实际结果：`GET http://127.0.0.1:3000/api/operator/task-flows?limit=5 返回 ok=true；当前本地数据包含 taskId=cmqkqbe440000azd0j3hp48xk，节点包含 task 与 audit，且节点已生成 taskFlowNodeId 级 taskFlowHref。`
- 通过状态：`通过`
- 问题记录：`无`
- 相关文件或测试：
  - `src/components/operator-console/multi-agent-flow.tsx`
  - `src/lib/operator-console/task-flow-read-model.ts`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-04 Runtime 单任务只读视图

- 测试编号：`T-04`
- 测试目标：确认 Runtime 只展示单任务运行态只读记录
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator#runtime`
  2. 检查未指定 `runtimeTaskId` 时的默认行为
  3. 检查安全提示与运行态摘要
- 预期结果：
  - 正常展示只读运行态
  - 不暴露 worker / token / connector / mutation 控制
- 实际结果：`GET http://127.0.0.1:3000/api/tasks/cmqkqbe440000azd0j3hp48xk/runtime-operator-view 返回 ok=true；当前任务 runtime jobs 为空，primaryStatus=empty，符合单任务只读空状态。`
- 通过状态：`通过`
- 问题记录：`无`
- 相关文件或测试：
  - `src/components/operator-console/runtime-execution-panel.tsx`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-05 `taskFlowTaskId` 任务级定位

- 测试编号：`T-05`
- 测试目标：确认 `taskFlowTaskId` 可高亮指定任务流
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator?taskFlowTaskId=task-1#task-flow`
  2. 检查命中 flow 是否显示任务级高亮
- 预期结果：
  - 命中的 flow 显示 `当前定位任务`
  - 不触发执行
- 实际结果：`http://127.0.0.1:3000/operator?taskFlowTaskId=cmqkqbe440000azd0j3hp48xk#task-flow 返回 200；taskId 在本地 Task Flow API 中存在。由于当前浏览器自动化插件缺少必需脚本，未能完成可视化高亮确认。`
- 通过状态：`阻塞`
- 问题记录：`P1：可视化高亮确认被浏览器工具阻塞；非业务代码问题。`
- 相关文件或测试：
  - `src/app/operator/page.tsx`
  - `src/components/operator-console/multi-agent-flow.tsx`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-06 `taskFlowNodeId` 节点级定位

- 测试编号：`T-06`
- 测试目标：确认 `taskFlowNodeId` 可高亮指定任务流节点
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator?taskFlowTaskId=task-1&taskFlowNodeId=runtime-job-1#task-flow`
  2. 检查命中节点是否显示节点级弱高亮
- 预期结果：
  - 对应 flow 显示任务级高亮
  - 对应节点显示 `当前定位节点`
  - runtime 节点可展示“查看运行态区块”
- 实际结果：`http://127.0.0.1:3000/operator?taskFlowTaskId=cmqkqbe440000azd0j3hp48xk&taskFlowNodeId=cmqkqbe440000azd0j3hp48xk#task-flow 返回 200；task 节点 ID 在本地 Task Flow API 中存在。由于当前浏览器自动化插件缺少必需脚本，未能完成可视化节点高亮确认。`
- 通过状态：`阻塞`
- 问题记录：`P1：可视化节点高亮确认被浏览器工具阻塞；非业务代码问题。`
- 相关文件或测试：
  - `src/app/operator/page.tsx`
  - `src/components/operator-console/multi-agent-flow.tsx`
  - `src/lib/operator-console/task-flow-read-model.ts`
  - `src/lib/operator-console/__tests__/task-flow-read-model.test.ts`

### T-07 `runtimeTaskId` 单任务运行态定位

- 测试编号：`T-07`
- 测试目标：确认 `runtimeTaskId` 可展示指定任务的运行态只读视图
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator?runtimeTaskId=task-1#runtime`
  2. 检查运行态过滤说明和目标任务内容
- 预期结果：
  - 显示指定任务的运行态只读视图
  - 不触发运行态执行
- 实际结果：`http://127.0.0.1:3000/operator?runtimeTaskId=cmqkqbe440000azd0j3hp48xk#runtime 返回 200；对应 runtime-operator-view API 返回 ok=true，且 jobs 为空。由于当前浏览器自动化插件缺少必需脚本，未能完成页面可视化确认。`
- 通过状态：`阻塞`
- 问题记录：`P1：Runtime 页面可视化确认被浏览器工具阻塞；API 与 URL 可访问。`
- 相关文件或测试：
  - `src/app/operator/page.tsx`
  - `src/components/operator-console/runtime-execution-panel.tsx`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-08 `runtimeSection=summary` 区块级定位

- 测试编号：`T-08`
- 测试目标：确认 summary 区块支持只读弱高亮
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator?runtimeTaskId=task-1&runtimeSection=summary#runtime`
  2. 检查 summary 区块高亮与提示文案
- 预期结果：
  - summary 区块弱高亮
  - 显示 `当前定位到运行态摘要区块`
- 实际结果：`http://127.0.0.1:3000/operator?runtimeTaskId=cmqkqbe440000azd0j3hp48xk&runtimeSection=summary#runtime 返回 200；当前任务 runtime jobs 为空。由于当前浏览器自动化插件缺少必需脚本，未能完成 summary 区块弱高亮可视确认。`
- 通过状态：`阻塞`
- 问题记录：`P1：summary 区块高亮确认被浏览器工具阻塞；API 与 URL 可访问。`
- 相关文件或测试：
  - `src/components/operator-console/runtime-execution-panel.tsx`
  - `src/components/operator-console/__tests__/operator-console.test.ts`

### T-09 `runtimeSection=latest-receipt` 区块级定位

- 测试编号：`T-09`
- 测试目标：确认 latest receipt 区块支持只读弱高亮
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator?runtimeTaskId=task-1&runtimeSection=latest-receipt#runtime`
  2. 检查 latest receipt 区块高亮与提示文案
- 预期结果：
  - latest receipt 区块弱高亮
  - 显示 `当前定位到最新 receipt 区块`
- 实际结果：`当前本地数据无 runtime receipt；缺少可用于 latest-receipt 验收的真实 taskId / receipt nodeId。`
- 通过状态：`阻塞`
- 问题记录：`P1：缺少 runtime receipt 样例数据，无法验证 latest-receipt 区块高亮。`
- 相关文件或测试：
  - `src/components/operator-console/runtime-execution-panel.tsx`
  - `src/lib/operator-console/overview-read-model.ts`
  - `src/lib/operator-console/__tests__/overview-read-model.test.ts`

### T-10 `runtimeSection=blocked-signal` 区块级定位

- 测试编号：`T-10`
- 测试目标：确认 blocked signal 区块支持只读弱高亮
- 访问 URL / 操作步骤：
  1. 打开 `http://localhost:3000/operator?runtimeTaskId=task-2&runtimeSection=blocked-signal#runtime`
  2. 检查 Blocked 区块高亮与提示文案
- 预期结果：
  - Blocked 区块弱高亮
  - 显示 `当前定位到 blocked signal 区块`
- 实际结果：`当前本地数据无 blocked runtime job；缺少可用于 blocked-signal 验收的真实 taskId / runtime job nodeId。`
- 通过状态：`阻塞`
- 问题记录：`P1：缺少 blocked runtime job 样例数据，无法验证 blocked-signal 区块高亮。`
- 相关文件或测试：
  - `src/components/operator-console/runtime-execution-panel.tsx`
  - `src/lib/operator-console/overview-read-model.ts`
  - `src/lib/operator-console/__tests__/overview-read-model.test.ts`

### T-11 Overview -> Task Flow / Runtime 联动

- 测试编号：`T-11`
- 测试目标：确认 Overview 摘要链接能带出更精确的 URL 参数
- 访问 URL / 操作步骤：
  1. 在 Overview 的 Active Runtime 点击“查看任务流 / 查看运行态”
  2. 在 Overview 的 Recent Receipts 点击“查看任务流 / 查看运行态”
  3. 在 Overview 的 Blocked Summary 中点击 runtime blocked 项链接
  4. 首轮建议人工核对以下 URL 形式是否出现：
     - `http://localhost:3000/operator?taskFlowTaskId=task-1&taskFlowNodeId=runtime-job-1#task-flow`
     - `http://localhost:3000/operator?runtimeTaskId=task-1&runtimeSection=summary#runtime`
     - `http://localhost:3000/operator?taskFlowTaskId=task-1&taskFlowNodeId=receipt-1#task-flow`
     - `http://localhost:3000/operator?runtimeTaskId=task-1&runtimeSection=latest-receipt#runtime`
     - `http://localhost:3000/operator?taskFlowTaskId=task-2&taskFlowNodeId=runtime-job-2#task-flow`
     - `http://localhost:3000/operator?runtimeTaskId=task-2&runtimeSection=blocked-signal#runtime`
- 预期结果：
  - Active Runtime 链接可带 `taskFlowNodeId` 或 `runtimeSection=summary`
  - Recent Receipts 链接可带 `taskFlowNodeId` 或 `runtimeSection=latest-receipt`
  - Blocked runtime 链接可带 `runtimeSection=blocked-signal`
- 实际结果：`当前 Overview API 返回 activeRuntime.count=0、blockedSummary.count=0、recentReceipts.count=0；缺少可点击的 Active Runtime / Blocked Summary / Recent Receipts 链接样例。`
- 通过状态：`阻塞`
- 问题记录：`P1：缺少 runtime job / receipt / blocked signal 样例数据，无法执行 Overview 联动点击验收。`
- 相关文件或测试：
  - `src/components/operator-console/operator-overview.tsx`
  - `src/lib/operator-console/overview-read-model.ts`
  - `src/lib/operator-console/__tests__/overview-read-model.test.ts`

### T-12 全程只读边界检查

- 测试编号：`T-12`
- 测试目标：确认整个 smoke test 过程中不存在任何执行入口
- 访问 URL / 操作步骤：
  1. 贯穿执行 T-01 ~ T-11
  2. 观察页面中是否出现按钮、执行入口、mutation 行为
- 预期结果：
  - 不出现 claim / run / complete / retry / approve
  - 不出现 worker / token / connector 控制
  - 不出现自动刷新、轮询、SSE
- 实际结果：`通过 HTTP/API 验证过程未触发 mutation API；未发现新增执行入口。由于浏览器自动化不可用，无法完成全页面可视点击巡检。`
- 通过状态：`阻塞`
- 问题记录：`P1：全程可视化巡检被浏览器工具阻塞；HTTP/API 侧未发现只读边界破坏。`
- 相关文件或测试：
  - `src/components/operator-console/__tests__/operator-console.test.ts`
  - `docs/operator-console-navigation-runbook.md`
  - `docs/operator-console-readonly-navigation-smoke-checklist.md`

---

## 最终结论

### 是否通过 smoke test

- 总体结论：`阻塞`

### 阻塞问题

- `浏览器自动化插件缺少必需脚本 browser-client.mjs，无法完成可视化点击与高亮确认。`
- `当前本地数据缺少 runtime job、runtime receipt、blocked runtime job，无法覆盖 T-09、T-10、T-11 的真实数据验收。`

### 后续修复建议

- `先补一组只读 runtime job / receipt / blocked runtime job 样例数据，再重跑 T-09 ~ T-11。`
- `修复或恢复浏览器自动化插件后，重跑 T-05 ~ T-08 与 T-12 的可视化高亮确认。`

### 备注

- 测试执行人：`Codex`
- 测试执行时间：`2026-06-19`
- 关联版本 / 分支：`当前工作区`

## 样例来源说明

首轮报告中填入的样例 ID 来自以下测试文件中的固定测试数据：

- `src/lib/operator-console/__tests__/task-flow-read-model.test.ts`
  - `task-1`
  - `runtime-job-1`
  - `receipt-1`
- `src/lib/operator-console/__tests__/overview-read-model.test.ts`
  - `task-1`
  - `task-2`
  - `runtime-job-1`
  - `runtime-job-2`
  - `receipt-1`

这些 ID 适合用来说明预期 URL 结构，但不保证本地真实数据库中一定存在。若本地服务启动后发现数据不一致，应保持测试项状态为“阻塞”或“待补样例”，不要用不存在的数据强行判定通过或失败。
