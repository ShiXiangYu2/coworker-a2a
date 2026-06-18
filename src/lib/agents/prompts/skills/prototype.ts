/**
 * Skill Prompt: prototype
 *
 * 快速原型验证，回答设计问题后再决定保留或丢弃。
 * 来源：auto-dev-framework/.agent/skills/prototype/SKILL.md
 *
 * 适用于 Jobs（产品 Agent）：原型验证、设计探索
 */

export const PROTOTYPE_SKILL_PROMPT = `## Skill: prototype — 原型验证

你正在执行 prototype Skill。你的任务是构建一个可丢弃的原型来回答一个具体的设计问题。

### 核心原则

1. **原型是回答问题的可丢弃代码** — 问题决定形状
2. **从第一天起就标记为可丢弃** — 原型代码放在使用位置附近，但命名要让读者一眼看出是原型
3. **一个命令就能运行** — 用户无需思考即可启动
4. **默认无持久化** — 状态存在于内存中
5. **跳过美化** — 无测试、无错误处理、无抽象
6. **暴露状态** — 每次操作后打印或渲染完整相关状态
7. **完成后删除或吸收** — 原型回答完问题后，删除或将验证过的决策融入正式代码

### 选择分支

根据问题类型选择对应分支：

#### LOGIC 分支 — "这个逻辑/状态模型感觉对吗？"
- 构建一个小型交互式终端应用
- 推动状态机通过难以在纸上推理的场景
- 适用于：状态机验证、业务规则验证、数据流验证

#### UI 分支 — "这个应该长什么样？"
- 在单个路由上生成多个截然不同的 UI 变体
- 通过 URL 搜索参数和浮动底栏切换
- 适用于：页面布局验证、用户路径验证、交互设计验证

如果问题不明确且用户不在，默认选择与周围代码匹配的分支（后端模块 → LOGIC，页面或组件 → UI）。

### 工作流程

1. **识别问题** — 从用户提示或周围代码中确定要回答的问题
2. **选择分支** — LOGIC 或 UI
3. **构建原型** — 遵循对应分支的规则
4. **暴露状态** — 让用户看到每次操作的结果
5. **记录结论** — 将答案保存到 commit message、ADR、issue 或 NOTES.md
6. **删除或吸收** — 原型代码的最终处理

### 输出格式

\`\`\`json
{
  "skill": "prototype",
  "status": "success",
  "confidence": 0.85,
  "summary": "通过 LOGIC 原型验证了任务状态机的 5 个关键场景",
  "data": {
    "branch": "LOGIC",
    "questionAnswered": "任务状态机在并发场景下是否正确",
    "filesChanged": ["src/__prototype__/task-state-machine.ts"],
    "decisionsCaptured": [
      { "decision": "采用最终一致性的状态同步", "reason": "并发场景下强一致不可行" }
    ],
    "disposition": "deleted"
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "原型已回答问题，决策已记录，可以进入实现"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 问题被回答 | status: success, disposition: deleted/absorbed |
| 原型无法回答问题 | status: failed, 需要重新定义问题 |
| 用户明确放弃 | status: success, disposition: deleted`

