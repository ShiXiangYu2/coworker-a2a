# coworker-a2a 对照学习资料的建设建议清单

## 背景

本清单基于 `D:\AI编程\产品自研\AI 生产系统\学习资料` 中的截图型学习资料整理，重点参考其中的 HARNESS 控制台、多 Agent 协作层、Obsidian 知识中枢、人工编排工作流、判断记录、债务登记、概念治理等设计。

当前 `coworker-a2a` 已经具备 AI 生产系统的核心底盘，包括 Agent runtime、workflow、tool governance、execution gateway、runtime execution、observability、Operator Console、memory、evidence 和 knowledge 等模块。学习资料对本项目的价值，不是从零设计功能，而是帮助现有能力进一步收束成一套可视化、可审计、可沉淀的 HARNESS 式 AI 生产治理系统。

## 总体判断

对照学习资料，`coworker-a2a` 当前最接近以下三层系统形态：

1. Agent 协作层
   - `src/lib/agents`
   - `src/lib/collaboration`
   - `src/lib/agent-runtime`

2. 编排与执行治理层
   - `src/lib/workflow`
   - `src/lib/tools`
   - `src/lib/execution-gateway`
   - `src/lib/runtime-execution`

3. 治理与控制台层
   - `src/lib/observability`
   - `src/components/operator-console`

当前项目缺的不是能力从 0 到 1，而是：

- 主流程统一
- 后台认知统一
- 治理资产结构化
- 知识沉淀产品化

## P0：立刻可做

### 1. 将 Operator Console 升级为 HARNESS 式总控台

对照学习资料：

- 总览
- 线程地图
- 机器全景
- 事件流

当前基础：

- `src/components/operator-console/operator-overview.tsx`
- `src/components/operator-console/multi-agent-flow.tsx`
- `src/components/operator-console/audit-timeline.tsx`
- `src/components/operator-console/runtime-execution-panel.tsx`

建设建议：

- 给 Operator Console 增加或重组为四个一级视图：
  - 总览
  - 任务流
  - 执行态
  - 治理台账
- 总览页不要只展示记录计数，而要展示：
  - 当前活跃任务数
  - 当前运行中的 AgentRun / RuntimeJob
  - 最近阻塞点
  - 最近审查发现
  - 最近执行回执
- `multi-agent-flow.tsx` 当前偏向从 assistant 文本中解析协作结果，建议升级为直接绑定 task、agent run、workflow、runtime job 等结构化记录的任务流程视图。

预期收益：

- 控制台从数据面板升级为系统驾驶舱。
- 更接近学习资料中的 HARNESS 体验。

### 2. 将现有流程统一成六阶段主生命周期

对照学习资料：

- 采访
- 工程共识
- 计划
- 执行
- 审查
- 修复

当前基础：

- `src/lib/workflow`
- `src/lib/harmony`
- `src/lib/eval`
- `src/lib/mvp-closure`

建设建议：

- 在 workflow / task summary 层明确加入阶段字段：
  - `intake`
  - `consensus`
  - `planning`
  - `execution`
  - `review`
  - `repair`
- Operator Console 上把每个任务挂到这条阶段链路上。
- runtime、eval、review、approval、receipt 等记录都应能映射回某个阶段。

预期收益：

- 用户、开发者、运营看到统一主流程。
- 降低现有模块之间的认知割裂。

## P1：中期演进

### 3. 增加线程地图 / 任务图谱视图

对照学习资料：

- 线程地图

当前基础：

- conversation
- task
- agent run
- tool call
- workflow proposal
- execution intent / runtime job / receipt
- eval / review

建设建议：

- 新增只读图谱视图，展示任务从用户请求到执行回执的关系链。
- 用节点和边表达：
  - 分叉
  - 汇合
  - 阻塞
  - 完成
- 起步阶段不需要复杂画布，可以先做 DAG 式时间线和节点列表混合视图。

预期收益：

- 让多 Agent、多记录、多审查、多执行链路可视化。
- 便于定位流程堵点和理解任务全貌。

### 4. 建设机器全景 / Agent-Skill-Tool 全景

对照学习资料：

- 机器全景
- 工具箱 - 39 个技能

当前基础：

- `src/lib/agents/registry.ts`
- `src/lib/tool-registry`
- `src/lib/agents/prompts/skills`

建设建议：

- 新增 Agent / Skill / Tool 全景页。
- 每个 Agent 展示：
  - 职责
  - 可调用技能
  - 最近调用次数
  - 最近成功率
  - 常见失败原因
- 每个 Skill 展示：
  - 所属阶段
  - 输入输出约定
  - 使用过的任务数
  - 对应 prompt 文件

预期收益：

- 将 prompt / skill 从代码资产升级为产品资产。
- 为后续自动编排、能力升级和问题排查提供基础。

### 5. 建立判断记录系统

对照学习资料：

- 判断记录

当前基础：

- audit event
- review record
- eval run
- approval record

当前不足：

- 判断本身还没有被抽象成一等对象。

建设建议：

- 新增 `decision record` 或 `judgment record` 模块。
- 专门记录：
  - 为什么路由到某个 Agent
  - 为什么允许或拒绝某个 Tool
  - 为什么某条评审结论成立
  - 为什么某个计划进入执行
- 建议字段：
  - judgment type
  - target type / target id
  - reason
  - evidence
  - status
  - supersededBy
  - createdAt / updatedAt

预期收益：

- 系统从有结果记录升级为有判断链记录。
- 更容易解释 AI 为什么做出某个选择。

### 6. 建立债务登记系统

对照学习资料：

- 债务登记

当前基础：

- failure
- regression gate
- eval finding
- review patch
- recovery point

当前不足：

- 问题来源分散在多个子域，缺少统一治理台账。

建设建议：

- 抽象统一的 `governance debt` 记录。
- 归并这些问题来源：
  - 漂移问题
  - 工具权限缺口
  - 规则不一致
  - 提示词质量问题
  - 执行可靠性问题
  - 证据不足问题
- 每条债务建议包含：
  - 类型
  - 严重度
  - 依赖关系
  - 判定证据
  - 关闭证据
  - 是否阻塞执行
  - 状态

预期收益：

- 系统迭代不再依赖人工记忆，而是依赖治理清单推进。
- 适合连续 sprint 演进。

## P2：后期治理

### 7. 建立概念治理 / 规则中枢

对照学习资料：

- 概念图
- GOAL Mode Physical Constraint

当前基础：

- `src/lib/tools/rules.ts`
- `src/lib/production-security/rules.ts`
- `src/lib/policy-engine`
- validators
- prompt / skill files

当前不足：

- 规则、概念、阶段定义和风险分类散落在代码与提示词中。

建设建议：

- 增加 `concept / policy glossary` 结构。
- 将以下对象正规化：
  - 术语
  - 风险分类
  - 执行边界
  - 阶段定义
  - 审查准则
  - policy 名称与适用范围
- 起步阶段可以先做只读聚合页，不必立即做完整编辑器。

预期收益：

- 规则从代码实现上升为产品治理资产。
- 有利于统一 prompt、policy、review 和 validator 的语义。

### 8. 将知识层从 memory 扩展为系统经验层

对照学习资料：

- Obsidian 作为个人知识库与数据中枢

当前基础：

- `src/lib/memory`
- `src/app/api/knowledge`
- `src/lib/evidence`

建设建议：

- 知识层不只保存文本摘要和候选记忆，还应逐步接纳：
  - 高质量 workflow 模板
  - 可复用 execution plan
  - 常见判断模式
  - 已关闭债务案例
  - 失败模式与修复套路
  - 高价值 evidence snapshot
- 将这些内容沉淀为系统经验知识库。

预期收益：

- 新任务不只是调用模型，而是能复用系统历史经验。
- 更符合多 Agent 生产系统的长期演进方向。

### 9. 将 Sprint 22 runtime 面板升级为运行控制中枢

对照学习资料：

- 编排器状态
- 执行状态
- 事件水位
- 在场会话
- 最近驳回 / 最近事件

当前基础：

- `src/lib/runtime-execution`
- `src/components/operator-console/runtime-execution-panel.tsx`
- `specs/sprint-22-controlled-runtime-execution`

建设建议：

- 在 runtime 面板上增加：
  - 队列水位
  - 活跃 lease
  - 最近阻塞原因
  - 最近 receipt 摘要
  - 最近 recovery point
  - idempotency 命中情况
- 从单任务只读视图逐步扩展为全局运行时总览。
- 继续维持 Sprint 22 的安全边界，不在控制台上暴露危险执行入口。

预期收益：

- 让 Sprint 22 的执行能力真正变成平台能力。
- 形成接近 HARNESS 风格的运行时控制台。

## 推荐执行顺序

1. P0：统一 Operator Console 结构。
2. P0：统一任务主生命周期。
3. P1：增加线程地图 / 任务图谱。
4. P1：增加机器全景 / Agent-Skill-Tool 全景。
5. P1：增加判断记录。
6. P1：增加债务登记。
7. P2：增加概念治理 / 规则中枢。
8. P2：升级知识层为系统经验层。
9. P2：升级 runtime 面板为运行控制中枢。

## 一句话总结

学习资料对 `coworker-a2a` 的最大启发，不是再多加几个 Agent，而是把现有 Agent、runtime、workflow、review、observability、memory 和 Operator Console 能力，收束成一套可视化、可审计、可沉淀的 HARNESS 式 AI 生产系统。
