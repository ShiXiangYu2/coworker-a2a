# API 文档

## 📖 概述

CoWorker-A2A 提供以下 API 端点：

## 🚀 执行引擎 API

### POST /api/execution

执行工具操作。

**请求体：**
```json
{
  "action": "execute_code",
  "input": {
    "code": "console.log('Hello!')",
    "language": "javascript"
  }
}
```

**支持的操作：**

| 操作 | 说明 | 需要审批 |
|------|------|----------|
| `execute_command` | 执行命令 | 否 |
| `write_file` | 写入文件 | 是 |
| `read_file` | 读取文件 | 否 |
| `execute_code` | 执行代码 | 否 |
| `git_status` | Git 状态 | 否 |

**响应：**
```json
{
  "ok": true,
  "data": {
    "id": "exec-123",
    "requestId": "req-456",
    "status": "completed",
    "output": {
      "stdout": "Hello!\n",
      "stderr": "",
      "language": "javascript"
    },
    "durationMs": 150,
    "sideEffects": [],
    "createdAt": "2026-06-19T12:00:00.000Z"
  }
}
```

### GET /api/execution?action=list

列出可用的操作。

**响应：**
```json
{
  "ok": true,
  "data": {
    "actions": [
      { "name": "read_file", "description": "读取文件", "requiresApproval": false },
      { "name": "write_file", "description": "写入文件", "requiresApproval": true },
      { "name": "execute_code", "description": "执行代码", "requiresApproval": false }
    ]
  }
}
```

## 💬 聊天 API

### POST /api/chat

发送消息并获取回复。

**请求体：**
```json
{
  "conversationId": "conv-123",
  "message": "帮我创建一个测试文件"
}
```

**响应：** SSE 流式响应

```
data: {"type":"start","conversationId":"conv-123"}
data: {"type":"route","decisionType":"delegate_to_agent","targetAgentId":"linus"}
data: {"type":"delta","content":"好的"}
data: {"type":"done","messageId":"msg-456"}
```

## 📊 Operator API

### GET /api/operator/overview

获取 Operator 总览数据。

**响应：**
```json
{
  "ok": true,
  "data": {
    "generatedAt": "2026-06-19T12:00:00.000Z",
    "totals": {
      "taskFlows": 5,
      "tasks": 10,
      "agentRuns": 20,
      "runtimeJobs": 3,
      "runtimeReceipts": 15,
      "blockedSignals": 2
    },
    "activeRuntime": { "count": 2, "items": [] },
    "blockedSummary": { "count": 1, "items": [] },
    "recentReceipts": { "count": 5, "items": [] },
    "recentFlows": []
  }
}
```

### GET /api/operator/runtime-control

获取运行控制中枢数据。

**响应：**
```json
{
  "ok": true,
  "data": {
    "queueWatermark": 5,
    "activeLeases": 3,
    "recentBlockedReasons": ["Timeout exceeded"],
    "recentReceipts": [],
    "recentRecoveryPoints": [],
    "idempotencyHits": 10,
    "totalJobs": 20,
    "completedJobs": 15,
    "failedJobs": 2
  }
}
```

## 🔍 治理 API

### GET /api/judgment-records

获取判断记录。

**查询参数：**
- `taskId` - 任务 ID
- `judgmentType` - 判断类型
- `status` - 状态

**响应：**
```json
{
  "ok": true,
  "data": [
    {
      "id": "jr-123",
      "judgmentType": "route_to_agent",
      "targetType": "task",
      "targetId": "task-456",
      "title": "路由到 Jobs Agent",
      "reason": "用户请求创建产品需求文档",
      "status": "active",
      "confidence": 0.95
    }
  ]
}
```

### GET /api/governance-debts

获取治理债务。

**查询参数：**
- `debtType` - 债务类型
- `severity` - 严重度
- `status` - 状态
- `stats=true` - 获取统计信息

**响应：**
```json
{
  "ok": true,
  "data": {
    "total": 10,
    "open": 5,
    "blocking": 2,
    "bySeverity": { "high": 2, "medium": 3 },
    "byType": { "drift": 3, "prompt_quality": 2 }
  }
}
```

### GET /api/concept-governance

获取概念治理数据。

**查询参数：**
- `conceptType` - 概念类型
- `status` - 状态

**响应：**
```json
{
  "ok": true,
  "data": [
    {
      "id": "cg-123",
      "conceptType": "term",
      "name": "agent_run",
      "displayName": "Agent 运行",
      "description": "Agent 执行任务的完整过程",
      "status": "active"
    }
  ]
}
```

## ⚠️ 错误处理

所有 API 返回统一的错误格式：

```json
{
  "ok": false,
  "error": {
    "message": "Error description"
  }
}
```

常见错误码：
- `400` - 请求参数错误
- `404` - 资源不存在
- `500` - 服务器内部错误
