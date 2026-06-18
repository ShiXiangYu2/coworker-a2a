# Plan: Sprint 1 — ChatHub 地基

> 技术方案 · 基于 PRD

---

## 架构决策

### 决策 1：流式响应方案

**选择：Server-Sent Events (SSE)**

- Next.js API Route 通过 `ReadableStream` 返回 SSE
- 前端使用 `EventSource` 或 `fetch` + `ReadableStream` 读取
- 理由：比 WebSocket 轻量，单向流足够，Claude API 本身支持 SSE

```
Frontend (fetch) → POST /api/chat → Claude API (SSE) → 流式转发 → Frontend 渲染
```

### 决策 2：LLM Provider 抽象

**选择：工厂模式 + 环境变量切换**

```
getLLMProvider()
  ├── LLM_PROVIDER=mock  → MockProvider（本地开发）
  └── LLM_PROVIDER=claude → ClaudeProvider（真实调用）
```

Mock Provider 返回固定流式响应，用于前端开发和测试。

### 决策 3：消息存储策略

**选择：先写 DB，再返回流式响应**

```
用户发送消息
    ↓
1. 如果 conversationId 为空 → 创建新对话（标题=消息前 50 字）
    ↓
2. 存储 user message 到 DB
    ↓
3. 调用 Claude API（流式）
    ↓
4. 每收到一个 delta → 存储到临时变量
    ↓
5. 流结束 → 存储完整 assistant message 到 DB（status=complete）
    ↓
6. 流中断 → 存储部分内容到 DB（status=incomplete），标记错误
    ↓
7. 返回 SSE 流给前端
```

**对话标题自动生成**：首条消息发送后，截取消息前 50 字作为对话标题。后续消息不更新标题。

### 决策 4：Markdown 渲染

**选择：react-markdown + rehype-highlight**

- `react-markdown` 渲染 Markdown
- `rehype-highlight` 代码语法高亮
- 理由：轻量、无 SSR 问题、社区成熟

## 模块划分

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| **LLM Provider** | 封装 Claude API 调用，支持 Mock | `src/lib/llm/` |
| **Chat API** | 处理聊天请求，流式响应 | `src/app/api/chat/route.ts` |
| **Conversation API** | 对话列表和消息历史 | `src/app/api/conversations/` |
| **Prisma Schema** | 数据模型定义 | `prisma/schema.prisma` |
| **ChatHub UI** | 聊天界面组件 | `src/components/chat/` |
| **ChatHub Page** | 主页面 | `src/app/page.tsx` |

## 依赖清单

```json
{
  "dependencies": {
    "next": "^16.2.9",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "@prisma/client": "^6.19.3",
    "@anthropic-ai/sdk": "^0.x",
    "react-markdown": "^9.x",
    "rehype-highlight": "^7.x"
  },
  "devDependencies": {
    "prisma": "^6.19.3",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "typescript": "^5",
    "vitest": "^4.1.8",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x"
  }
}
```

## 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Claude API 流式响应格式变更 | 低 | 中 | 使用官方 SDK，抽象 Provider |
| SQLite 并发写入冲突 | 低 | 低 | MVP 单用户，不存在并发 |
| SSE 连接中断 | 中 | 中 | 前端重连 + 消息完整性校验 |
| Markdown 渲染 XSS | 低 | 高 | 使用 isomorphic-dompurify 清理 |
