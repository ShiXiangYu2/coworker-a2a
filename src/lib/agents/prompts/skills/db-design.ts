/**
 * Skill Prompt: db-design
 *
 * 标准化数据库设计流程，自动生成数据模型、迁移脚本和种子数据。
 * 来源：auto-dev-framework/.agent/skills/db-design/SKILL.md
 *
 * 适用于 Linus（工程 Agent）：数据库设计、数据模型
 */

export const DB_DESIGN_SKILL_PROMPT = `## Skill: db-design — 数据库设计

你正在执行 db-design Skill。你的任务是标准化数据库设计流程，确保数据模型规范、迁移安全、种子数据完整。

### 核心原则

1. **命名规范**：表名复数 snake_case，字段名 snake_case
2. **关系完整**：外键、索引、约束定义清晰
3. **状态机明确**：每个有状态的实体定义状态流转
4. **迁移安全**：每个迁移有回滚脚本

### 工作流程

1. **分析需求** — 读取 PRD，识别核心实体和关系
2. **设计数据模型** — 表结构、字段类型、关系和索引
3. **设计状态机** — 状态流转、约束、变更日志
4. **生成迁移脚本** — Prisma Schema + 迁移文件
5. **生成种子数据** — 演示数据，覆盖所有状态和角色
6. **生成文档** — ER 图、数据字典、API 对照表

### 设计规范

#### 表命名
- 使用复数名词：users, knowledge_cards
- 使用 snake_case：knowledge_cards, policy_links
- 避免保留字

#### 字段命名
- 主键：id (UUID 或 CUID)
- 外键：{table}_id：user_id, department_id
- 时间戳：created_at, updated_at
- 状态字段：status, review_status

#### 索引设计
- 主键：自动创建
- 唯一约束：自动创建
- 外键：建议创建
- 高频查询字段：status, category, created_at
- 组合查询字段：(status, category), (department_id, status)

#### 状态机设计
每个有状态的实体必须定义：
- 状态列表
- 状态流转图
- 状态约束（谁可以触发转换）
- 状态变更日志

### 输出格式

\`\`\`json
{
  "skill": "db-design",
  "status": "success",
  "confidence": 0.9,
  "summary": "设计了 5 个表，包含完整的状态机和索引",
  "data": {
    "tables": [
      {
        "name": "knowledge_cards",
        "fields": 12,
        "indexes": 4,
        "states": ["draft", "pending_review", "published", "rejected"]
      }
    ],
    "schemaFile": "prisma/schema.prisma",
    "migrationFiles": ["migrations/20260611_add_knowledge_cards"],
    "seedFile": "prisma/seed.ts",
    "erDiagram": "docs/er-diagram.svg"
  },
  "next": {
    "recommendedAction": "continue",
    "reason": "数据库设计完成，迁移和种子数据已生成"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 所有表设计完成 | status: success |
| 需求不明确 | status: requires_human |
| 与现有表冲突 | status: blocked, 需要协调 |`
