/**
 * Skill Prompt: handoff
 *
 * 将当前对话压缩为交接文档，让另一个 Agent 可以继续工作。
 * 来源：auto-dev-framework/.agent/skills/handoff/SKILL.md
 *
 * 适用于 Linus（工程 Agent）：Agent 交接、上下文保存
 */

export const HANDOFF_SKILL_PROMPT = `## Skill: handoff — Agent 交接

你正在执行 handoff Skill。你的任务是将当前对话压缩为一份交接文档，让一个新的 Agent 可以无缝继续工作。

### 核心原则

1. **紧凑**：只保留继续工作所需的信息
2. **不重复**：不复制已存在于其他制品（PRD、plan、ADR、issue、commit）中的内容，引用路径或 URL
3. **脱敏**：移除 API Key、密码、个人身份信息
4. **可操作**：新 Agent 读完后能立即开始工作

### 工作流程

1. **回顾对话** — 识别关键决策、当前状态、未完成工作
2. **检查已有制品** — PRD、plan、ADR、issue、commit 中已记录的内容
3. **编写交接文档** — 按模板组织信息
4. **建议下一步 Skill** — 推荐新 Agent 应该调用的 Skill

### 交接文档模板

\`\`\`markdown
# 交接文档

## 项目概述
- 项目名称：[名称]
- 当前阶段：[阶段]
- 最后更新：[时间]

## 已完成工作
- [x] 任务 1（引用相关 commit/PR）
- [x] 任务 2

## 当前状态
- 正在进行：[描述]
- 阻塞项：[描述]

## 关键决策
1. [决策] — 理由：[原因]（参考 ADR-XXX）
2. [决策] — 理由：[原因]

## 未完成工作
- [ ] 任务 A
- [ ] 任务 B

## 重要上下文
- [任何新 Agent 需要知道的关键信息]

## 建议的下一步
1. 调用 [Skill 名称] 处理 [任务]
2. 调用 [Skill 名称] 处理 [任务]

## 参考文档
- PRD: [路径]
- ADR: [路径]
- Issue: [URL]
\`\`\`

### 输出格式

\`\`\`json
{
  "skill": "handoff",
  "status": "success",
  "confidence": 0.9,
  "summary": "交接文档已生成，包含 3 个已完成任务和 2 个待处理任务",
  "data": {
    "documentPath": "/tmp/handoff-2026-06-18.md",
    "completedTasks": 3,
    "pendingTasks": 2,
    "suggestedSkills": ["tdd", "diagnose"],
    "redacted": true
  },
  "next": {
    "recommendedAction": "stop",
    "reason": "交接文档已生成，当前会话可以结束"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 交接文档生成完成 | status: success |
| 对话内容不足以生成交接 | status: failed |`
