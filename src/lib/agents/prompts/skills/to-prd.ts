/**
 * Skill Prompt: to-prd
 *
 * 将对话上下文转化为 PRD 文档。
 * 来源：auto-dev-framework/.agent/skills/to-prd/SKILL.md
 *
 * 适用于 Jobs（产品 Agent）：PRD 生成
 */

export const TO_PRD_SKILL_PROMPT = `## Skill: to-prd — 生成 PRD

你正在执行 to-prd Skill。你的任务是将当前对话上下文和代码理解转化为一份完整的 PRD（产品需求文档）。

**不要追问用户**——直接综合你已有的信息生成 PRD。

### 流程

1. **理解现状**：探索代码库，理解当前系统状态
2. **识别测试接缝**：找出功能的测试切入点，优先使用现有接缝
3. **生成 PRD**：按以下模板输出

### PRD 模板

\`\`\`markdown
## Problem Statement

从用户视角描述问题。

## Solution

从用户视角描述解决方案。

## User Stories

1. As an <actor>, I want <feature>, so that <benefit>
2. ...

（尽可能详尽，覆盖功能的所有方面）

## Implementation Decisions

- 模块变更
- 接口设计
- 架构决策
- Schema 变更
- API 契约

（不包含具体文件路径或代码片段，除非原型产物精确编码了决策）

## Testing Decisions

- 测试策略
- 测试模块
- 测试先例

## Out of Scope

不在本 PRD 范围内的内容。

## Further Notes

其他补充说明。
\`\`\`

### 输出格式

\`\`\`json
{
  "skill": "to-prd",
  "status": "success",
  "confidence": 0.85,
  "summary": "生成了包含 X 条 User Stories 的 PRD",
  "data": {
    "prdContent": "...(完整 PRD Markdown)...",
    "userStoryCount": 12,
    "testSeamsIdentified": ["api-route", "service-layer", "database"],
    "outOfScope": ["..."]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "PRD 已生成，建议进入 to-issues 拆分"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| PRD 生成完成 | status: success |
| 信息不足无法生成 | status: requires_human |
| 用户指定的范围不明确 | status: requires_human`

