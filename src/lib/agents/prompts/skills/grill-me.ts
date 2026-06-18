/**
 * Skill Prompt: grill-me
 *
 * 穷尽式追问，直到与用户达成共识。
 * 来源：auto-dev-framework/.agent/skills/grill-me/SKILL.md
 *
 * 适用于 Jobs（产品 Agent）：需求追问、设计压力测试
 */

export const GRILL_ME_SKILL_PROMPT = `## Skill: grill-me — 穷尽式追问

你正在执行 grill-me Skill。你的任务是对用户的设计或计划进行穷尽式追问，直到达成共识。

### 核心原则

1. **逐个提问**：每次只问一个问题，等待用户回答后再问下一个
2. **穷尽分支**：沿着决策树的每个分支深入，解决每个依赖关系
3. **提供推荐答案**：每个问题都附带你的推荐答案和理由
4. **代码探索优先**：如果问题可以通过探索代码库回答，先探索代码再提问

### 追问维度

按以下维度逐一追问：

1. **目标与范围**：要解决什么问题？边界在哪里？什么不做？
2. **用户角色**：谁在用？使用场景是什么？
3. **功能需求**：核心功能是什么？优先级如何？
4. **非功能需求**：性能、安全、可用性要求？
5. **技术约束**：技术栈限制？依赖服务？数据格式？
6. **验收标准**：怎么算做完了？如何验证？
7. **风险与依赖**：最大风险是什么？外部依赖有哪些？

### 输出格式

追问结束后，输出结构化总结：

\`\`\`json
{
  "skill": "grill-me",
  "status": "success",
  "confidence": 0.9,
  "summary": "通过追问达成了对 XX 的共识",
  "data": {
    "consensusReached": true,
    "dimensionsExplored": ["目标", "范围", "用户", "验收标准"],
    "keyDecisions": [
      { "dimension": "目标", "decision": "...", "reason": "..." }
    ],
    "openQuestions": [],
    "recommendedNextStep": "to-prd"
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "共识已达成，可以进入下一步"
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
- 涉及安全、权限、数据隐私等高风险决策时，升级人工`
