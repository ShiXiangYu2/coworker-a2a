/**
 * Skill Prompt: knowledge-to-skill
 *
 * 知识到 Skill 提取：把书籍、课程、访谈、论文、经验转化为可调用能力。
 * 来源：auto-dev-framework/.agent/skills/knowledge-to-skill/SKILL.md
 *
 * 适用于 Jobs（产品 Agent）：知识提取、能力封装
 */

export const KNOWLEDGE_TO_SKILL_SKILL_PROMPT = `## Skill: knowledge-to-skill — 知识到 Skill 提取

你正在执行 knowledge-to-skill Skill。你的任务是把知识材料转化为可执行能力资产，而不是泛泛总结。

### 核心流程

\`\`\`
来源材料 → 知识地图 → Skill 提取 → Skill 封装 → Value Eval → 复用
\`\`\`

### 工作流程

#### 1. Source Framing（来源澄清）

先问清楚：
- 来源是什么（书、课程、笔记、访谈、论文、内部文档）
- 要给谁用
- 在什么场景调用
- 要提取什么能力
- 哪些内容不进入 skill

完成标志：能用一句话说清楚"为 [用户]，在 [场景] 下，从 [来源] 提取 [能力]，用于 [可观察任务]。"

#### 2. Knowledge Map（知识地图）

输出必须包含：
- **核心命题**：来源的核心观点
- **概念地图**：关键概念及其关系
- **方法地图**：可执行的方法和步骤
- **决策规则**：条件判断和分支逻辑
- **来源证据**：每个结论的出处
- **Skill 候选**：可能封装为 Skill 的能力

规则：没有来源证据时，不进入 Skill Extraction。

#### 3. Skill Extraction（Skill 提取）

一个能力只有满足以下条件才值得封装：
- 有明确触发场景
- 有输入和输出
- 有可执行步骤
- 有边界和失败处理
- 有来源证据支撑
- 有 Eval 可以验证

#### 4. Skill Packaging（Skill 封装）

根据复用强度选择形态：

| 形态 | 适用情况 |
|------|----------|
| SOP | 人类执行为主，流程还在验证 |
| Template | 输出格式稳定，需要反复填写 |
| Skill | Agent 需要反复调用 |
| Script | 需要确定性、批量或低错误率 |

#### 5. Value Eval（价值验证）

至少验证：
- 是否节省时间
- 是否提升质量
- 是否可复用
- 是否产生业务价值或降低风险

### 输出格式

\`\`\`json
{
  "skill": "knowledge-to-skill",
  "status": "success",
  "confidence": 0.85,
  "summary": "从《XX 书》中提取了 3 个可执行 Skill",
  "data": {
    "sourceType": "book",
    "knowledgeMap": {
      "corePropositions": ["..."],
      "conceptMap": ["..."],
      "methodMap": ["..."]
    },
    "skillsExtracted": [
      {
        "name": "skill-name",
        "trigger": "当用户需要...",
        "inputs": ["..."],
        "outputs": ["..."],
        "packaging": "skill"
      }
    ],
    "valueEval": {
      "timeSaved": "预计每次节省 30 分钟",
      "qualityImproved": "标准化输出格式",
      "reusable": true
    }
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "知识提取完成，Skill 已封装"
  }
}
\`\`\`

### 规则

- 不把 AI 总结当作事实，关键规则必须能追溯来源
- 不把整本书塞进 skill，只抽取可执行能力
- 不为一次性灵感创建 skill
- 没有 Eval 的能力不算可复用资产
- 涉及高风险决策时，必须保留人工确认`
