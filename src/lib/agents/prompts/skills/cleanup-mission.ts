/**
 * Skill Prompt: cleanup-mission
 *
 * 清理部分完成的 Mission 创建的所有资源。
 * 来源：auto-dev-framework/.agent/skills/cleanup-mission/SKILL.md
 *
 * 适用于 Elon（CEO Agent）：资源清理、任务回滚
 */

export const CLEANUP_MISSION_SKILL_PROMPT = `## Skill: cleanup-mission — 资源清理与回滚

你正在执行 cleanup-mission Skill。你的任务是清理部分或完全完成的 Mission 创建的所有资源。

### 使用场景

- Mission 中途放弃，需要清理已创建的资源
- Mission 失败，需要回滚已完成的部分
- 重新开始一个干净的环境

### 核心原则

1. **幂等性**：清理命令可以安全重复执行
2. **依赖顺序**：按依赖关系逆序删除
3. **共享保护**：被其他 Mission 使用的资源不删除
4. **预览优先**：先 dry-run 确认，再执行

### 工作流程

#### 1. 读取资源记录
从 \`.mission/<mission>/resources.md\` 读取该 Mission 创建的所有资源。

#### 2. 分析依赖图
- 确定可以安全清理的资源
- 标记共享资源（不可清理）
- 确定删除顺序（逆序）

#### 3. 预览清理（dry-run）
显示：
- 将要删除的资源列表
- 依赖关系分析
- 无法清理的共享资源警告

#### 4. 执行清理
按依赖顺序逆序删除资源。

#### 5. 生成清理报告

### 资源清理规则

| 资源类型 | 清理方式 |
|---------|---------|
| DB Tables | DROP TABLE（如果未被其他 Mission 使用） |
| Migrations | 标记为 rolled-back |
| Deployments | 删除部署产物 |
| Lambda | delete-function |
| Files | 删除创建的源代码文件 |
| Git branches | 删除 Mission 分支 |

### 输出格式

\`\`\`json
{
  "skill": "cleanup-mission",
  "status": "success",
  "confidence": 0.95,
  "summary": "Mission user-management 清理完成：删除 3 个资源，跳过 1 个共享资源",
  "data": {
    "missionSlug": "user-management",
    "deleted": [
      { "type": "DB Table", "name": "users", "issue": "#1" },
      { "type": "Lambda", "name": "password-reset-function", "issue": "#2" }
    ],
    "skipped": [
      { "type": "DB Table", "name": "shared_config", "reason": "被其他 Mission 使用" }
    ],
    "alreadyDeleted": [
      { "type": "Migration", "name": "001_create_users.sql" }
    ],
    "summary": {
      "deletedCount": 3,
      "skippedCount": 1,
      "alreadyDeletedCount": 1
    }
  },
  "next": {
    "recommendedAction": "stop",
    "reason": "清理完成，Mission 资源已回滚"
  }
}
\`\`\`

### 终止条件

| 条件 | 输出 |
|------|------|
| 清理完成 | status: success |
| 资源记录不存在 | status: failed, mission not found |
| 共享资源冲突 | status: requires_human |`
