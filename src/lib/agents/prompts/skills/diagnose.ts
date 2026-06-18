/**
 * Skill Prompt: diagnose
 *
 * 严谨的 Bug 诊断循环。
 * 来源：auto-dev-framework/.agent/skills/diagnose/SKILL.md
 *
 * 适用于 Turing（验证 Agent）：Bug 诊断、失败分析
 */

export const DIAGNOSE_SKILL_PROMPT = `## Skill: diagnose — Bug 诊断循环

你正在执行 diagnose Skill。你正在用严谨的方法诊断一个 Bug 或性能回退。

### 六阶段流程

#### Phase 1: 构建反馈循环（最关键）

**这是诊断的核心。** 如果你有一个快速、确定、可自动运行的 pass/fail 信号，你就能找到原因。

构建反馈循环的方式（按优先级）：
1. 在合适的接缝处写失败测试
2. Curl / HTTP 脚本
3. CLI 调用 + 快照对比
4. 一次性测试脚手架
5. 二分法脚手架

**在进入 Phase 2 之前，必须有一个可信赖的反馈循环。**

#### Phase 2: 复现

运行反馈循环，确认：
- [ ] 产生的是用户描述的故障模式（不是别的）
- [ ] 可复现
- [ ] 已捕获精确症状

#### Phase 3: 假设

生成 **3-5 个排序假设**，每个必须可证伪：

> 格式："如果 <X> 是原因，那么 <改变 Y> 会让 Bug 消失 / <改变 Z> 会让它更糟。"

在测试前展示给用户。

#### Phase 4: 探测

每个探测对应一个假设的预测。**一次只改一个变量。**

工具偏好：调试器 > 定向日志 > 不要"打满日志然后 grep"

所有调试日志加唯一前缀，如 \`[DEBUG-a4f2]\`。

#### Phase 5: 修复 + 回归测试

**先写回归测试，再修复**——但只在有正确接缝时。

如果无正确接缝，那本身就是发现。

#### Phase 6: 清理 + 事后分析

- [ ] 原始复现不再复现
- [ ] 回归测试通过
- [ ] 所有调试 instrumentation 已移除
- [ ] 正确的假设已记录在 commit 中

### 输出格式

\`\`\`json
{
  "skill": "diagnose",
  "status": "success",
  "confidence": 0.8,
  "summary": "诊断完成：根因是 XX，已通过 YY 修复",
  "data": {
    "rootCause": "...",
    "hypothesisRanking": [
      { "rank": 1, "hypothesis": "...", "prediction": "...", "confirmed": true },
      { "rank": 2, "hypothesis": "...", "prediction": "...", "confirmed": false }
    ],
    "reproMethod": "failing test / curl script / ...",
    "fixApplied": "...",
    "regressionTest": "..."
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "Bug 已修复并通过回归测试"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 原始复现不再复现 + 回归测试通过 | status: success |
| 确认根因但无法修复 | status: requires_human |
| 无法构建反馈循环 | status: requires_human |
| 超过 5 轮假设-验证未收敛 | status: requires_human |`
