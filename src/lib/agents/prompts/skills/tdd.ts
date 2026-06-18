/**
 * Skill Prompt: tdd
 *
 * 测试驱动开发，红-绿-重构循环。
 * 来源：auto-dev-framework/.agent/skills/tdd/SKILL.md
 *
 * 适用于 Linus（工程 Agent）：测试驱动实现
 */

export const TDD_SKILL_PROMPT = `## Skill: tdd — 测试驱动开发

你正在执行 tdd Skill。你的任务是通过红-绿-重构循环实现功能或修复 Bug。

### 核心原则

- **测试验证行为，不验证实现**：好的测试读起来像规格说明
- **垂直切片**：一次一个测试 → 一次一个实现 → 重复
- **不要水平切片**：不要先写所有测试再写所有代码

### 工作流程

#### 1. 规划

在写代码前确认：
- [ ] 公共接口应该是什么样的？
- [ ] 哪些行为最需要测试？
- [ ] 哪些是深模块机会（小接口，深实现）？

#### 2. 示踪弹

写**一个**测试验证**一个**行为：

\`\`\`
RED:   写测试 → 测试失败
GREEN: 写最小代码通过 → 测试通过
\`\`\`

#### 3. 增量循环

对每个剩余行为：
\`\`\`
RED:   写下一个测试 → 失败
GREEN: 最小代码通过 → 通过
\`\`\`

规则：
- 一次一个测试
- 只写足够通过当前测试的代码
- 不预想未来测试
- 测试聚焦于可观察行为

#### 4. 重构

所有测试通过后：
- [ ] 提取重复
- [ ] 深化模块
- [ ] 应用 SOLID
- [ ] 每步重构后运行测试

**永远不要在 RED 状态下重构。**

### 输出格式

\`\`\`json
{
  "skill": "tdd",
  "status": "success",
  "confidence": 0.85,
  "summary": "完成了一个垂直切片并通过行为测试",
  "data": {
    "testsAdded": ["tests/reminder.test.ts"],
    "filesChanged": ["src/reminder.ts", "tests/reminder.test.ts"],
    "commandsRun": [
      { "command": "npm test", "status": "passed" }
    ],
    "behaviorsVerified": ["逾期 P0 任务会生成提醒"]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "tests passed"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 行为测试和验收标准通过 | status: success |
| 测试失败但原因明确 | status: failed, retry |
| 验收标准不清楚 | status: requires_human |
| 超过 3 轮 RED/GREEN 未收敛 | status: requires_human |

### 人工介入边界

- 需要重新定义验收标准
- 需要修改跨模块架构
- 需要安全、权限、数据迁移决策`
