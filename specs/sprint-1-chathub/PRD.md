# PRD: Sprint 1 — ChatHub 地基

> CoWorker+A2A 生产系统 · 第一个迭代
> 创建日期：2026-06-15

---

## Problem Statement

我正在构建一个基于多 Agent 协作的个人 AI 生产系统（CoWorker+A2A），目标是让 AI Agent 之间通过 Agent-to-Agent 通信自动化完成业务工作流。

当前状态：有一份完整的架构设计文档和方法论（auto-dev-framework），但**没有任何可运行的代码**。

第一个迭代的核心问题是：**用户没有一个界面能跟 AI 对话**。整个系统的交互入口（ChatHub）尚不存在。

## Solution

构建一个最小可运行的 Web 应用，包含：

1. **ChatHub UI** — 用户能输入消息、看到 Claude 的流式回复、对话历史持久化
2. **Claude API 集成** — 后端 API Route 调用 Claude API，支持流式响应（SSE）
3. **消息持久化** — SQLite 存储对话历史，刷新页面不丢失
4. **可配置 System Prompt** — System Prompt 不硬编码，支持后续注入 Agent 行为规范

这是整个 CoWorker+A2A 系统的地基。后续 Sprint 2（Elon CEO Agent 路由）、Sprint 3（Clockless Engine）都建立在这个基础上。

## User Stories

1. 作为用户，我能在 ChatHub 输入框中输入自然语言消息并发送
2. 作为用户，我能看到 Claude 的流式回复（逐字输出，不是等全部生成完再显示）
3. 作为用户，我能在对话过程中看到消息列表（我的消息 + Claude 的回复），按时间顺序排列
4. 作为用户，我刷新页面后能看到之前的对话历史
5. 作为用户，我能在 ChatHub 中新建一个对话（清空当前上下文）
6. 作为用户，我能看到每条消息的时间戳
7. 作为用户，我能看到 Claude 正在生成的状态指示（loading 动画）
8. 作为用户，我能在 Claude 生成过程中点击停止按钮中断生成
9. 作为用户，我的消息输入框支持多行输入（Shift+Enter 换行，Enter 发送）
10. 作为用户，我能看到消息中的 Markdown 格式被正确渲染（代码块、列表、加粗等）
11. 作为用户，我能看到代码块有语法高亮
12. 作为用户，我的对话数据存储在本地 SQLite 中，不依赖外部服务
13. 作为用户，我能在终端通过 `npm run dev` 启动项目并在浏览器中访问 ChatHub
14. 作为开发者，我能看到 API 错误时前端有友好的错误提示（不是白屏）
15. 作为开发者，我能在 .env 文件中配置 Claude API Key 和 System Prompt
16. 作为开发者，我能在 .env 中切换 LLM Provider（mock / claude），方便本地开发

## Implementation Decisions

### 1. 技术栈

| 组件 | 选择 | 理由 |
|------|------|------|
| 框架 | Next.js 16 (App Router) | 前后端一体，API Route + SSR |
| 语言 | TypeScript | 类型安全 |
| 数据库 | SQLite (Prisma ORM) | MVP 阶段零运维，后续可迁移 PostgreSQL |
| 样式 | Tailwind CSS v4 | 快速出活 |
| LLM SDK | `@anthropic-ai/sdk` | 官方 SDK，Tool Use 等高级功能支持完整 |
| 测试 | Vitest + Testing Library | 与 evercog-mvp 一致 |

### 2. 数据模型

**Conversation（对话）**

```
- id: String (cuid)
- title: String (对话标题，首条消息前 50 字)
- createdAt: DateTime
- updatedAt: DateTime
```

**Message（消息）**

```
- id: String (cuid)
- conversationId: String (外键)
- role: String ("user" | "assistant" | "system")
- content: String (消息内容，Markdown)
- status: String ("complete" | "incomplete")  // incomplete = 流式中断
- createdAt: DateTime
```

### 3. API 设计

**POST /api/chat** — 发送消息并获取 Claude 流式回复

请求：
```json
{
  "conversationId": "abc123",  // 可选，为空时自动创建新对话
  "message": "帮我分析一下这个竞品"
}
```

响应（SSE 流式）：
```
data: {"type":"start","messageId":"msg_001","conversationId":"conv_001"}
data: {"type":"delta","content":"好的"}
data: {"type":"delta","content":"，我来"}
data: {"type":"done","messageId":"msg_001"}
```

**GET /api/conversations** — 获取对话列表

**GET /api/conversations/:id/messages** — 获取某对话的消息历史

**POST /api/conversations** — 创建空对话（可选，也可通过 /api/chat 自动创建）

### 4. System Prompt 策略

Sprint 1 使用基础 System Prompt：

```
你是 CoWorker+A2A 生产系统的 AI 助手。你正在与用户对话，帮助他们完成工作任务。
请用中文回复，保持专业、简洁。
```

System Prompt 从环境变量 `SYSTEM_PROMPT` 读取，或使用默认值。后续 Sprint 2 将改为动态加载 Agent 的 SKILL.md。

### 5. LLM 调用策略

- **Mock 模式**（默认）：不调真实 API，返回模拟流式响应，方便本地开发
- **Claude 模式**：设置 `LLM_PROVIDER=claude` + `ANTHROPIC_API_KEY` 后调真实 Claude API
- 流式响应使用 Server-Sent Events (SSE)

### 6. UI 布局

采用**单页面对话**布局（Sprint 1 不做侧边栏）：

```
┌─────────────────────────────────────────┐
│  CoWorker+A2A              [新建对话]    │  ← 顶部导航栏
├─────────────────────────────────────────┤
│                                         │
│         消息列表区域                      │  ← 聊天消息（滚动）
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  输入框  [发送]                   │    │  ← 底部输入区
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

- 消息气泡：用户消息靠右（蓝色背景），Claude 回复靠左（灰色背景）
- 支持 Markdown 渲染（react-markdown + rehype-highlight）
- 输入框：多行，Enter 发送，Shift+Enter 换行

### 7. 项目结构

```
coworker-a2a/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # ChatHub 主页面
│   │   └── api/
│   │       ├── chat/route.ts   # POST /api/chat（流式）
│   │       └── conversations/
│   │           ├── route.ts    # GET /api/conversations
│   │           └── [id]/
│   │               └── messages/route.ts
│   ├── components/
│   │   ├── chat/
│   │   │   ├── message-list.tsx
│   │   │   ├── message-bubble.tsx
│   │   │   ├── chat-input.tsx
│   │   │   └── typing-indicator.tsx
│   │   └── ui/
│   │       └── button.tsx
│   └── lib/
│       ├── prisma.ts           # Prisma 客户端单例
│       ├── llm/
│       │   ├── index.ts        # Provider 工厂
│       │   ├── claude.ts       # Claude API 调用
│       │   ├── mock.ts         # Mock Provider
│       │   └── types.ts        # 类型定义
│       └── errors.ts           # 错误处理
├── .env.example
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

## Testing Decisions

### 测试原则

- 测试外部行为（API 响应、UI 交互），不测试实现细节
- Mock LLM 调用，不依赖真实 Claude API
- 重点测试：消息发送→流式回复→持久化→刷新后可恢复

### 测试切面

| 切面 | 测试内容 | 测试方式 |
|------|---------|---------|
| **ChatHub UI** | 输入框输入→点击发送→消息出现在列表中 | React Testing Library |
| **API Route** | POST /api/chat 返回 SSE 流式响应 | HTTP 请求测试 |
| **消息持久化** | 发送消息→刷新→GET /api/conversations/:id/messages 返回历史 | 集成测试 |
| **System Prompt** | 环境变量变更后，LLM 调用使用新 Prompt | 单元测试 |

### Mock 策略

```typescript
// Mock LLM Provider 返回固定流式响应
const mockStream = async function*() {
  yield { type: 'delta', content: '你好' }
  yield { type: 'delta', content: '，我是' }
  yield { type: 'delta', content: 'CoWorker' }
  yield { type: 'done' }
}
```

## Out of Scope

以下功能明确**不包含**在 Sprint 1 中：

- 侧边栏对话列表（后续迭代）
- Agent 路由（Sprint 2：Elon CEO Agent）
- 知识库检索（后续迭代）
- 多用户/认证系统（Sprint 1 单用户，无登录）
- 任务状态管理（Sprint 3：Clockless Engine）
- Agent 间通信（Sprint 4-5）
- 监控仪表盘（Sprint 6）
- Docker 部署
- 单元测试覆盖率目标（先跑通，后补测试）

## Further Notes

### 与 CoWorker+A2A 架构的关系

Sprint 1 对应架构图中的最底层：

```
┌─────────────────────────────────────────┐
│              ChatHub（统一交互入口）       │  ← Sprint 1 建这里
│                  Claude 主脑              │
└──────────────────────┬──────────────────┘
                       │
┌──────────────────────┴──────────────────┐
│           Agent 协作层（Agent-to-Agent）  │  ← Sprint 2-5
└──────────────────────┬──────────────────┘
                       │
┌──────────────────────┴──────────────────┐
│          Harmony（任务/流程状态管理）      │  ← Sprint 3
└──────────────────────┬──────────────────┘
                       │
┌──────────────────────┴──────────────────┐
│     Obsidian（个人知识库 & 素材中台）     │  ← Sprint 5
└──────────────────────┬──────────────────┘
                       │
┌──────────────────────┴──────────────────┐
│              工具集成层（外部服务）        │  ← Sprint 6
└─────────────────────────────────────────┘
```

### 开发方法论

本 PRD 使用 auto-dev-framework 的 `to-prd` 方法生成。后续开发将使用：
- `/tdd` — 测试驱动开发
- `/diagnose` — Bug 诊断
- `/loop-review` — 独立审查
