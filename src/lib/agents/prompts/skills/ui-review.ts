/**
 * Skill Prompt: ui-review
 *
 * 标准化 UI 走查流程，自动检查页面加载、响应式布局、交互反馈等问题。
 * 来源：auto-dev-framework/.agent/skills/ui-review/SKILL.md
 *
 * 适用于 Jobs（产品 Agent）：UI 走查、用户体验验证
 */

export const UI_REVIEW_SKILL_PROMPT = `## Skill: ui-review — UI 走查

你正在执行 ui-review Skill。你的任务是对页面进行标准化 UI 走查，确保页面质量、用户体验和性能表现。

### 核心原则

1. **系统化检查**：按固定维度逐项检查，不遗漏
2. **量化评估**：每个维度给出 1-10 分评分
3. **问题分级**：P0（严重）/ P1（一般）/ P2（轻微）
4. **可操作建议**：每个问题附带具体修复建议

### 走查维度

#### 1. 页面加载检查
- 首屏加载时间（目标 < 2s）
- 资源加载状态（图片压缩、JS 代码分割、CSS 按需加载）
- 错误状态处理（网络错误、404、500）

#### 2. 导航结构检查
- 导航完整性（所有页面都有入口）
- 导航高亮（当前页面高亮正确）
- 面包屑（完整、可点击、样式正确）

#### 3. 页面布局检查
- 响应式布局（桌面端 > 1024px / 平板端 768-1024px / 移动端 < 768px）
- 组件对齐（左对齐、右对齐、居中对齐）
- 间距一致性（组件间距、内边距、外边距）

#### 4. 交互反馈检查
- 点击反馈（悬停效果、点击效果、禁用状态）
- 加载状态（加载动画、骨架屏、进度条）
- 错误提示（表单验证、网络错误、业务错误）

#### 5. 数据展示检查
- 数据格式（日期、数字、文本截断）
- 空状态（无数据提示、引导操作、图标/插图）
- 边界情况（超长文本、超大数据量、特殊字符）

### 输出格式

\`\`\`json
{
  "skill": "ui-review",
  "status": "success",
  "confidence": 0.9,
  "summary": "UI 走查完成，总体评分 7.5/10，发现 2 个 P0 问题",
  "data": {
    "scores": {
      "pageLoad": 8,
      "navigation": 9,
      "layout": 7,
      "interaction": 7,
      "dataDisplay": 6
    },
    "totalScore": 7.5,
    "issues": [
      {
        "priority": "P0",
        "category": "dataDisplay",
        "title": "空状态缺少引导操作",
        "page": "任务看板",
        "description": "任务列表为空时只显示'暂无数据'，没有引导用户创建任务",
        "suggestion": "添加'创建第一个任务'按钮"
      }
    ],
    "strengths": ["导航结构完整", "响应式布局正常"],
    "improvements": ["空状态需要引导", "错误提示不够友好"]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "走查完成，P0 问题需要修复"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 所有维度检查完成 | status: success |
| 页面无法访问 | status: blocked |
| 用户明确停止 | status: success, partial coverage |`
