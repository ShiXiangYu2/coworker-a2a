/**
 * Skill Prompt: api-design
 *
 * 标准化 API 设计流程，自动生成 API 文档、Mock 数据和测试用例。
 * 来源：auto-dev-framework/.agent/skills/api-design/SKILL.md
 *
 * 适用于 Linus（工程 Agent）：API 设计、接口规范
 */

export const API_DESIGN_SKILL_PROMPT = `## Skill: api-design — API 设计

你正在执行 api-design Skill。你的任务是标准化 API 设计流程，确保 API 设计规范、文档完整、可测试。

### 核心原则

1. **RESTful 规范**：路径使用复数名词、kebab-case
2. **一致性**：请求/响应格式统一
3. **完整性**：错误码定义完整
4. **可测试**：Mock 数据和测试用例同步生成

### 工作流程

1. **分析需求** — 读取 PRD，识别需要的 API，确定边界
2. **设计 API 清单** — 列出所有 API，确定方法和路径
3. **设计请求/响应** — 参数、响应格式、错误码
4. **生成文档** — OpenAPI 格式 + 说明文档
5. **生成 Mock 数据** — 支持成功/失败/空数据场景
6. **生成测试用例** — 正常流程 + 边界 + 错误测试

### 设计规范

#### 路径设计
- 获取列表：GET /api/{resource}
- 获取单个：GET /api/{resource}/{id}
- 创建：POST /api/{resource}
- 更新：PUT /api/{resource}/{id}
- 删除：DELETE /api/{resource}/{id}
- 嵌套资源：GET /api/{resource}/{id}/sub-resource

#### 请求规范
- 分页：?page=1&limit=10
- 排序：?sort=createdAt&order=desc
- 筛选：?status=pending&category=faq
- 搜索：?search=关键词

#### 响应规范
\`\`\`json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 10, "total": 100 }
}
\`\`\`

#### 错误响应
\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "参数校验失败",
    "details": [{ "field": "title", "message": "标题不能为空" }]
  }
}
\`\`\`

### 输出格式

\`\`\`json
{
  "skill": "api-design",
  "status": "success",
  "confidence": 0.9,
  "summary": "设计了 8 个 API，生成了 OpenAPI 文档和 Mock 数据",
  "data": {
    "apiCount": 8,
    "apis": [
      {
        "method": "GET",
        "path": "/api/knowledge-cards",
        "description": "获取知识卡列表",
        "params": ["page", "limit", "status", "category"]
      }
    ],
    "documents": ["api/openapi.yaml", "api/README.md"],
    "mockData": ["api/mocks/knowledge-cards.json"],
    "testCases": ["tests/api/knowledge-cards.test.ts"]
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "API 设计完成，文档和测试已生成"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 所有 API 设计完成 | status: success |
| 需求不明确 | status: requires_human |
| 与现有 API 冲突 | status: blocked, 需要协调 |`
