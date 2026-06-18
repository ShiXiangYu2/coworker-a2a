/**
 * Skill Prompt: improve-codebase-architecture
 *
 * 发现代码库的架构深化机会，将浅模块转化为深模块。
 * 来源：auto-dev-framework/.agent/skills/improve-codebase-architecture/SKILL.md
 *
 * 适用于 Linus（工程 Agent）：架构改进、重构建议
 */

export const IMPROVE_CODEBASE_ARCHITECTURE_SKILL_PROMPT = `## Skill: improve-codebase-architecture — 架构改进

你正在执行 improve-codebase-architecture Skill。你的任务是发现代码库中的架构摩擦点，提出深化机会 — 将浅模块转化为深模块，提升可测试性和 AI 可导航性。

### 核心术语

- **Module（模块）**：任何有接口和实现的东西（函数、类、包）
- **Interface（接口）**：调用者必须知道的一切：类型、不变量、错误模式、顺序、配置
- **Implementation（实现）**：接口内部的代码
- **Depth（深度）**：接口的杠杆率 — 小接口背后大量行为 = 深模块
- **Seam（接缝）**：接口所在的位置；行为可以被改变而不需要原地编辑的地方
- **Adapter（适配器）**：在接缝处满足接口的具体东西
- **Leverage（杠杆）**：调用者从深度中获得的东西
- **Locality（局部性）**：维护者从深度中获得的东西：变更、bug、知识集中在一处

### 核心测试

**删除测试**：想象删除这个模块。如果复杂性消失了，它是透传模块。如果复杂性在 N 个调用者中重新出现，它就在发挥作用。

### 工作流程

#### 1. 探索
- 先读取项目的领域词汇表和相关 ADR
- 有机地探索代码库，记录摩擦点
- 对疑似浅模块应用删除测试

#### 2. 识别候选
寻找以下模式：
- 理解一个概念需要在多个小模块间跳转
- 模块是浅层的 — 接口几乎和实现一样复杂
- 纯函数仅为了可测试性而提取，但真正的 bug 藏在调用方式中
- 紧耦合模块泄漏跨接缝
- 代码库中未测试或难以通过当前接口测试的部分

#### 3. 呈现候选
为每个候选提供：
- **涉及文件**：哪些文件/模块
- **问题**：为什么当前架构造成摩擦
- **解决方案**：会改变什么
- **好处**：用局部性和杠杆解释，以及测试如何改进
- **推荐强度**：Strong / Worth exploring / Speculative

#### 4. 深入讨论
用户选择一个候选后，进入追问模式：
- 约束、依赖、深化模块的形状
- 接缝背后是什么
- 哪些测试会保留

### 输出格式

\`\`\`json
{
  "skill": "improve-codebase-architecture",
  "status": "success",
  "confidence": 0.85,
  "summary": "发现 3 个架构深化机会，推荐优先处理 auth 模块",
  "data": {
    "candidates": [
      {
        "files": ["src/auth/", "src/middleware/"],
        "problem": "auth 逻辑分散在 5 个模块中，修改一个需要改 3 个文件",
        "solution": "将 auth 逻辑集中到 AuthModule，提供统一接口",
        "benefits": "提升局部性：变更集中在一处；提升可测试性：通过接口测试",
        "recommendation": "Strong"
      }
    ],
    "topRecommendation": "auth 模块深化",
    "adrConflicts": []
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "架构分析完成，等待用户选择候选"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 候选已呈现 | status: success, 等待用户选择 |
| 代码库太小无法分析 | status: completed, 无候选 |
| 发现严重架构问题 | status: requires_human |`
