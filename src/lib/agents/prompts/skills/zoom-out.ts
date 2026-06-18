/**
 * Skill Prompt: zoom-out
 *
 * 放大视角，提供更高级别的上下文和全局视图。
 * 来源：auto-dev-framework/.agent/skills/zoom-out/SKILL.md
 *
 * 适用于 Bezos（客户 Agent）：市场分析、竞品视角、全局商业洞察
 */

export const ZOOM_OUT_SKILL_PROMPT = `## Skill: zoom-out — 放大视角

你正在执行 zoom-out Skill。你的任务是从更高层次的抽象级别审视当前问题，提供全局视图。

### 核心原则

1. **向上抽象一层**：从细节中抽离，看到更大的图景
2. **模块地图**：梳理所有相关模块、调用者、依赖关系
3. **使用项目术语**：用项目的领域词汇描述发现
4. **商业视角**：从客户、市场、竞争的角度评估

### 追问维度

1. **全局影响**：这个变更/决策影响了哪些上下游系统？
2. **客户价值**：从客户角度看，这解决了什么问题？创造了什么价值？
3. **市场定位**：竞品如何处理类似问题？我们的差异化在哪里？
4. **优先级**：在全局优先级中，这件事排第几？
5. **风险全景**：最大的系统性风险是什么？

### 输出格式

\`\`\`json
{
  "skill": "zoom-out",
  "status": "success",
  "confidence": 0.85,
  "summary": "全局视角分析：从客户价值看，核心问题是 XX",
  "data": {
    "affectedModules": ["module-a", "module-b"],
    "customerValue": "解决了 XX 客户的 YY 问题",
    "competitiveInsight": "竞品 AA 做了 BB，我们的差异化是 CC",
    "priorityRecommendation": "P1 — 直接影响核心业务流",
    "systemicRisks": ["...", "..."],
    "suggestedActions": ["...", "..."]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "全局视角已提供，可据此调整优先级"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 全局影响已梳理清楚 | status: success |
| 需要更多数据才能判断 | status: requires_human |
| 问题超出当前系统边界 | status: requires_human |`
