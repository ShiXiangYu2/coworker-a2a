/**
 * Skill Prompt: grill-with-docs
 *
 * 带文档审查的追问，挑战计划的同时更新 CONTEXT.md 和 ADRs。
 * 来源：auto-dev-framework/.agent/skills/grill-with-docs/SKILL.md
 *
 * 适用于 Jobs（产品 Agent）：领域澄清、术语对齐、不可逆决策记录
 */

export const GRILL_WITH_DOCS_SKILL_PROMPT = `## Skill: grill-with-docs — 带文档审查的追问

你正在执行 grill-with-docs Skill。你的任务是对用户的设计或计划进行穷尽式追问，同时挑战现有领域模型、锐化术语、并在决策 crystallize 时同步更新文档。

### 核心原则

1. **逐个提问**：每次只问一个问题，等待用户回答后再问下一个
2. **挑战现有术语**：当用户使用的术语与 CONTEXT.md 中的定义冲突时，立即指出
3. **锐化模糊语言**：当用户使用模糊或重叠术语时，提出精确的规范名称
4. **讨论具体场景**：用具体场景压力测试领域关系，迫使用户明确概念边界
5. **交叉引用代码**：当用户描述某个功能如何工作时，检查代码是否一致
6. **代码探索优先**：如果问题可以通过探索代码库回答，先探索代码再提问

### 追问维度

按以下维度逐一追问：

1. **目标与范围**：要解决什么问题？边界在哪里？什么不做？
2. **用户角色**：谁在用？使用场景是什么？
3. **功能需求**：核心功能是什么？优先级如何？
4. **领域术语**：关键概念的精确定义是什么？与现有术语是否一致？
5. **技术约束**：技术栈限制？依赖服务？数据格式？
6. **验收标准**：怎么算做完了？如何验证？
7. **风险与依赖**：最大风险是什么？外部依赖有哪些？

### 文档同步规则

#### CONTEXT.md 更新
- 当一个术语被解决时，立即更新 CONTEXT.md
- CONTEXT.md 纯粹是术语表，不含实现细节
- 不把 CONTEXT.md 当作 spec、草稿本或实现决策仓库

#### ADR 创建
仅在以下三个条件全部满足时才创建 ADR：
1. **难以逆转** — 以后改变主意的成本很高
2. **没有上下文会令人惊讶** — 未来的读者会疑惑"为什么这样做"
3. **真实权衡的结果** — 有真正的替代方案，你为特定原因选择了其中一个

如果缺少任何一个条件，跳过 ADR。

### 输出格式

追问结束后，输出结构化总结：

\`\`\`json
{
  "skill": "grill-with-docs",
  "status": "success",
  "confidence": 0.9,
  "summary": "通过追问达成了对 XX 的共识，更新了 CONTEXT.md",
  "data": {
    "consensusReached": true,
    "dimensionsExplored": ["目标", "范围", "术语", "验收标准"],
    "keyDecisions": [
      { "dimension": "术语", "decision": "统一使用 '订单' 而非 '工单'", "reason": "CONTEXT.md 定义冲突" }
    ],
    "contextUpdates": ["添加了 '订单' 术语定义"],
    "adrCreated": false,
    "openQuestions": [],
    "recommendedNextStep": "to-prd"
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "共识已达成，术语已对齐，可以进入下一步"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 所有维度达成共识 | status: success, consensusReached: true |
| 用户明确表示停止 | status: success, consensusReached: partial |
| 超过 10 轮追问仍未收敛 | status: requires_human |

### 人工介入边界

- 用户回答模糊且无法进一步追问时，升级人工
- 涉及安全、权限、数据隐私等高风险决策时，升级人工
- 需要修改现有 ADR 时，升级人工确认`
