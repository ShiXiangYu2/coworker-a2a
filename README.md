# CoWorker+A2A

CoWorker+A2A 是一个基于多 Agent 协作的个人 AI 生产系统原型。通过 Agent-to-Agent 通信实现自动化工作流，人类控制方向，AI 负责执行，知识沉淀在本地。

## 技术栈

- **框架**: Next.js 16 (App Router) + TypeScript
- **数据库**: SQLite + Prisma ORM
- **样式**: Tailwind CSS v4
- **LLM SDK**: @anthropic-ai/sdk
- **测试**: Vitest + Testing Library

## Agent 架构

系统包含 6 个 Agent，各司其职：

| Agent | 角色 | 职责 | Skill |
|-------|------|------|-------|
| **Kelvin** | Chairman (Human) | 人类决策者，最终控制权 | — |
| **Elon** | CEO Agent | 理解意图、分解任务、协调 Agent | ai-builder-methodology |
| **Jobs** | Product | 需求定义、PRD、用户体验 | grill-me, to-prd |
| **Linus** | Engineering | 代码实现、技术架构 | tdd |
| **Turing** | Verification | 测试、质量保障、Bug 诊断 | diagnose, loop-review |
| **Bezos** | Customer | 客户反馈、市场洞察 | zoom-out |

## 当前能力

### 核心 (Sprint 1-4)
- ChatHub 单页面聊天 UI（侧边栏 + 消息列表 + 输入框）
- Mock LLM Provider 默认可用，无需 API Key
- SSE 流式响应 (`/api/chat`)
- SQLite + Prisma 对话持久化
- 对话历史加载和切换
- 可配置 System Prompt
- 静态 Agent 注册表（6 个 Agent）
- LLM 驱动的 CEO Agent 路由（Tool Use 意图识别 + 多 Agent 分解）
- Harmony Task Engine（RouteDecision → Task → State → Audit → UI）
- ConfirmationArtifact 人工审批流程
- Agent Runtime 分析执行 + 确定性结果生成

### 治理层 (Sprint 5-14)
- Memory / Knowledge / A2A 消息持久化
- Tool 集成与权限边界
- Eval 验证与质量门
- 可观测性事件与恢复点
- 多 Agent 协作会话
- 生产安全策略与 API 认证边界
- File / Git / PR 提案工作流
- 外部集成与 MCP 治理
- 人工门控工作流编排记录

### Sprint 15 — 真实运行时
- **LLM 运行时**: Claude API 集成（流式 + Tool Use），失败时回退到 Mock
- **Agent Skill Prompts**: 7 个 Skill 从 auto-dev-framework 同步并集成
- **Tool 沙箱执行**: 白名单命令执行 + 超时 + 输出截断 + 禁止模式检测
- **MVP Eval**: 4 层评估（功能、安全、边界、业务价值）

## 快速开始

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env

# 初始化数据库
npx prisma db push

# 启动开发服务器
npm run dev
```

打开 http://localhost:3000

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `file:./dev.db` | SQLite 数据库路径 |
| `LLM_PROVIDER` | `mock` | LLM 提供商（`mock` / `claude`） |
| `ANTHROPIC_API_KEY` | `""` | Claude API Key（`LLM_PROVIDER=claude` 时必填） |
| `SYSTEM_PROMPT` | `""` | 自定义 System Prompt（可选） |

## 命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run test     # 运行测试
npm run lint     # 代码检查
```

## 演示指南

### 触发不同 Agent

在 ChatHub 输入以下消息，观察路由和响应：

| 输入 | 路由目标 | 说明 |
|------|---------|------|
| `你好` | chat_only | 普通对话，不触发 Agent |
| `帮我分析竞品` | Jobs (Product) | 产品分析任务 |
| `帮我写一段代码` | Linus (Engineering) | 工程实现任务 |
| `帮我测试这个功能` | Turing (Verification) | 质量验证任务 |
| `客户反馈怎么样` | Bezos (Customer) | 客户洞察任务 |
| `帮我规划路线图` | Elon (CEO) | 任务分解与协调 |

> **注意**: Mock 模式下所有消息走 `chat_only` 路径。要测试真实 Agent 路由，需设置 `LLM_PROVIDER=claude` + `ANTHROPIC_API_KEY`。

### 端到端流程

1. 用户在 ChatHub 输入消息
2. CEO Router (Elon) 分析意图，决定路由目标
3. 如果命中 Agent → 创建 HarmonyTask → 启动 AgentRun
4. Agent 使用 Skill Prompt 执行分析
5. 结构化结果通过 SSE 流式返回前端
6. 前端渲染路由卡片 / 任务卡片 / 消息列表

## API 端点

### Chat
- `POST /api/chat` — 发送消息，获取流式回复

### Agent Router
- `POST /api/agent-router/route` — 路由消息到 Agent
- `GET /api/agents` — 获取 Agent 列表

### Harmony Tasks
- `POST /api/harmony/tasks/from-route` — 从路由决策创建任务
- `GET /api/harmony/tasks` — 任务列表
- `GET /api/harmony/tasks/:id` — 任务详情

### Agent Runtime
- `POST /api/agent-runtime/runs/from-task` — 启动 Agent 分析
- `GET /api/agent-runtime/runs/:id` — 运行详情

### Conversations
- `GET /api/conversations` — 对话列表
- `GET /api/conversations/:id/messages` — 对话消息历史

## 项目结构

```
coworker-a2a/
├── prisma/
│   ├── schema.prisma          # 数据模型（30+ 模型）
│   └── dev.db                 # SQLite 数据库
├── src/
│   ├── app/
│   │   ├── page.tsx           # ChatHub 主页面
│   │   └── api/               # API 路由（284+ 端点）
│   ├── components/chat/       # UI 组件（12 种卡片）
│   └── lib/
│       ├── agents/            # Agent 注册表 + 路由 + Skill Prompts
│       ├── harmony/           # Harmony Task Engine
│       ├── agent-runtime/     # Agent Runtime 执行
│       ├── llm/               # LLM Provider（Mock + Claude）
│       └── evidence/          # Evidence 治理层
├── .env.example               # 环境变量模板
└── package.json
```

## 当前不在范围

- Agent-to-Agent 运行时通信
- Memory / Obsidian 知识库集成
- Tool Runtime 外部工具执行
- 生产级可观测性与恢复系统
- Docker 部署
- CI/CD 流水线
