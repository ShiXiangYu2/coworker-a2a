/**
 * Skill Prompt: signal-analyzer
 *
 * 对 scan-signals 的原始发现进行交叉分析，识别关联模式并生成行动建议。
 * 来源：auto-dev-framework/.agent/skills/signal-analyzer/SKILL.md
 *
 * 适用于 Bezos（客户 Agent）：信号分析、市场洞察
 */

export const SIGNAL_ANALYZER_SKILL_PROMPT = `## Skill: signal-analyzer — 信号分析

你正在执行 signal-analyzer Skill。你的任务是对原始发现进行交叉分析，识别信号之间的关联模式，生成按优先级排序的可执行行动建议。

### 核心原则

1. **看见关系**：scan-signals 看见碎片，signal-analyzer 看见关系
2. **交叉分析**：多维度关联，不孤立看待信号
3. **可执行**：每个建议都有明确的行动和优先级
4. **量化**：用置信度和优先级排序

### 分析维度

#### 1. 因果关联
检测信号之间的因果关系：
- Commit → CI 失败：CI 失败时间在某 commit 之后
- PR → Issue 关闭：PR body 中有 "Fixes #N"
- Issue 依赖链：Issue body 中有 "blocked by #N"

#### 2. 聚类分析
将碎片信号聚合成可管理的任务包：
- **按模块**：多个 Issue/失败涉及同一目录
- **按类型**：多个失败属于同一类型
- **按优先级**：P0 信号必须立即处理

#### 3. 优先级重排
基于交叉分析结果，重新排序原始发现的优先级：

| 升级条件 | 降级条件 |
|----------|----------|
| 有因果关联的多个信号 | 孤立的低影响信号 |
| 涉及安全/认证模块 | 仅影响开发体验 |
| 连续多次出现 | 首次出现且有 workaround |

### 输出格式

\`\`\`yaml
analysis:
  timestamp: "2026-06-13T09:05:00Z"
  input_findings: 5

  correlations:
    - type: "causal"
      from: "commit:abc123"
      to: "ci-failure:run-12345"
      confidence: 0.85
      description: "commit abc123 引入了 auth 模块变更，随后 CI 失败"

  clusters:
    - name: "auth-module"
      findings: ["F-001", "F-003", "F-005"]
      count: 3
      recommendation: "集中处理 auth 模块问题"

  reprioritized:
    - id: "F-001"
      original_priority: "P1"
      new_priority: "P0"
      reason: "auth 模块连续失败，影响主分支"

  action_plan:
    - action: "auto-heal"
      target: "F-001"
      priority: "P0"
      confidence: 0.9
      description: "修复 auth 模块 CI 失败"
    - action: "triage"
      target: "F-003"
      priority: "P1"
      confidence: 0.8
      description: "处理 auth 相关 Issue"
\`\`\`

### JSON 输出格式

\`\`\`json
{
  "skill": "signal-analyzer",
  "status": "success",
  "confidence": 0.85,
  "summary": "分析了 5 个信号，发现 2 个因果关联，1 个聚类",
  "data": {
    "inputFindings": 5,
    "correlations": [
      {
        "type": "causal",
        "from": "commit:abc123",
        "to": "ci-failure:run-12345",
        "confidence": 0.85,
        "description": "commit abc123 引入了 auth 模块变更，随后 CI 失败"
      }
    ],
    "clusters": [
      {
        "name": "auth-module",
        "findings": ["F-001", "F-003", "F-005"],
        "count": 3,
        "recommendation": "集中处理 auth 模块问题"
      }
    ],
    "reprioritized": [
      {
        "id": "F-001",
        "originalPriority": "P1",
        "newPriority": "P0",
        "reason": "auth 模块连续失败"
      }
    ],
    "actionPlan": [
      {
        "action": "auto-heal",
        "target": "F-001",
        "priority": "P0",
        "confidence": 0.9
      }
    ]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "分析完成，可以执行行动建议"
  }
}
\`\`\`

### Loop 集成

\`\`\`yaml
pipeline:
  - skill: "scan-signals"       # 扫描原始信号
  - skill: "signal-analyzer"    # 交叉分析
  - skill: "auto-heal"          # 处理分析后的行动
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 分析完成 | status: success |
| 无信号可分析 | status: completed, no findings |
| 需要更多上下文 | status: requires_human |`
