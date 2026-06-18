/**
 * Skill Prompt: to-issues
 *
 * 将计划、规格或 PRD 拆分为可独立领取的 Issue，使用垂直切片。
 * 来源：auto-dev-framework/.agent/skills/to-issues/SKILL.md
 *
 * 适用于 Elon（CEO Agent）：任务拆分、Issue 管理
 */

export const TO_ISSUES_SKILL_PROMPT = `## Skill: to-issues — 垂直切片拆分

你正在执行 to-issues Skill。你的任务是将计划、规格或 PRD 拆分为可独立领取的 Issue，使用垂直切片（tracer bullet）方法。

### 核心原则

1. **垂直切片**：每个 Issue 是一个薄的垂直切片，穿越所有集成层（schema、API、UI、测试）
2. **独立可验证**：完成的 Issue 可以独立演示或验证
3. **多而薄**：优先多个薄切片，而非少数厚切片
4. **两种类型**：AFK（可无人执行）和 HITL（需要人工交互）

### 工作流程

#### 1. 收集上下文
从对话上下文中工作。如果有 Issue 引用，获取其完整内容。

#### 2. 探索代码库（可选）
如果尚未探索代码库，先探索以了解当前状态。

#### 3. 起草垂直切片
将计划拆分为 tracer bullet Issue。每个 Issue 是一个穿越所有层的薄切片。

规则：
- 每个切片交付一个窄但完整的路径
- 完成的切片可以独立演示
- 优先 AFK 切片，减少 HITL 切片

#### 4. 向用户确认
展示编号列表，每个切片包含：
- **标题**：简短描述性名称
- **类型**：HITL / AFK
- **依赖**：哪些其他切片必须先完成
- **覆盖的用户故事**：解决了哪些用户故事

询问用户：
- 粒度是否合适？
- 依赖关系是否正确？
- 是否需要合并或进一步拆分？

#### 5. 发布 Issue
按依赖顺序发布（先发布阻塞者），使用 Issue body 模板。

### Issue 模板

\`\`\`markdown
## Parent

引用父 Issue（如果有）

## What to build

这个垂直切片要交付的端到端行为。描述行为，不是逐层实现。

## Acceptance criteria

- [ ] 验收标准 1
- [ ] 验收标准 2

## Blocked by

- 引用阻塞的 ticket（如果有）
- 或 "None - can start immediately"
\`\`\`

### 输出格式

\`\`\`json
{
  "skill": "to-issues",
  "status": "success",
  "confidence": 0.9,
  "summary": "将 PRD 拆分为 6 个垂直切片 Issue",
  "data": {
    "totalIssues": 6,
    "afkCount": 4,
    "hitlCount": 2,
    "issues": [
      {
        "number": 1,
        "title": "知识卡 CRUD API",
        "type": "AFK",
        "blockedBy": [],
        "acceptanceCriteria": ["创建知识卡", "查询知识卡列表"]
      }
    ],
    "dependencyOrder": [1, 2, 3, 4, 5, 6]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "Issue 拆分完成，可以开始执行"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 所有切片已发布 | status: success |
| 用户拒绝拆分方案 | status: requires_human |
| PRD 不够详细 | status: needs_input |`
