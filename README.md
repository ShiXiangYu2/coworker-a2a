# CoWorker+A2A

CoWorker+A2A 是一个面向“完整 Agent 公司”的本地治理原型。它把用户需求、Agent 分析、工具提案、工作流提案、证据导入、部门画像、部门证据映射、人类门控执行记录、部门任务归属评审串成一条可审阅、可追踪、可回放为证据的 v1 治理闭环。

当前 v1 的核心原则是：本地治理记录优先、sanitized evidence only、human-gated、recommendation-only。Operator Console 中的审批只批准单个本地 record，不代表真实运行时授权，也不会自动执行 Agent、ToolRun、workflow、文件写入、Git、外部 API、MCP、部署、发布或 Task completed。

## 当前阶段

- Sprint 1-15：核心 Agent / Task / Tool / Workflow / Eval / Observability / MVP closure 已完成并封版。
- Sprint 16：Operator Console UX 已完成并收尾。
- Sprint 17：Read-only Evidence Import Sandbox 已完成并收尾。
- Sprint 18：Department Agent Profiles 已完成并收尾。
- Sprint 19：Department-Aware Operator Review / Evidence-to-Department Mapping 已完成并收尾。
- Sprint 20：Department Runtime Execution Gateway / Human-Gated Execution 已完成并收尾。
- Sprint 21：Department Task Intake / Assignment Review 已完成并收尾。
- 当前状态：v1 阶段性完结前的前端补全与产品级收尾。

## 技术栈

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite + Prisma ORM
- Vitest + Testing Library
- Mock LLM Provider，支持按配置接入 Claude

## v1 能力闭环

1. ChatHub：接收用户需求，保留对话上下文。
2. Agent Router：形成意图识别和本地任务记录。
3. Harmony Task：维护 Task lifecycle 和审计事件。
4. Agent Runtime：记录 AgentRun / AgentResult。
5. Tool Governance：记录 ToolCall / ToolRun / ToolExecutionReceipt 与权限边界。
6. Workflow Governance：记录 WorkflowProposal / WorkflowStepRecord。
7. Evidence Sandbox：只导入 sanitized evidence snapshot。
8. Department Profiles：维护 DepartmentProfile / DepartmentAgentRole / PermissionBoundary。
9. Evidence Mapping：把 sanitized evidence 映射到部门记录，形成 coverage / gap / mapping review。
10. Execution Gateway：记录 execution intent / plan / gate / approval / receipt，但不执行。
11. Assignment Review：记录 task intake / department assignment proposal / role fit review / assignment approval / audit。
12. Operator Console：展示本地记录、状态、审计、时间线、安全边界。

## 快速开始

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

打开：

- ChatHub: http://localhost:3000
- Operator Console: http://localhost:3000/operator

## 常用命令

```bash
npx prisma validate
npm run test
npm run lint
npm run build
```

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `file:./dev.db` | SQLite 数据库地址 |
| `LLM_PROVIDER` | `mock` | LLM provider，可选 `mock` / `claude` |
| `ANTHROPIC_API_KEY` | 空 | 使用 Claude provider 时填写 |
| `SYSTEM_PROMPT` | 空 | 可选系统提示词 |

## 安全边界

v1 前端和治理 API 必须保持以下边界：

- 只展示和维护本地治理记录。
- Sprint 17-21 records 只能作为 sanitized evidence / local review reference。
- Eval / RegressionGate / ReleaseReadiness 只能作为 recommendation / evidence。
- Kelvin approval 只批准单个本地 record，不批准未来同类操作。
- Recovery / Resume 只做 view-only / policy-only，不执行 rollback、restore、retry、replay 或 resume execution。

禁止把任何 review approval 解释为：

- execution token
- routing token
- assignment token
- runtime permission grant
- release token
- deploy token
- task completion token

## 项目结构

```text
coworker-a2a/
├─ prisma/
│  └─ schema.prisma
├─ specs/
│  ├─ contracts/
│  └─ sprint-1...sprint-21/
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  ├─ operator/
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ chat/
│  │  └─ operator-console/
│  └─ lib/
│     ├─ agent-runtime/
│     ├─ department/
│     ├─ department-assignment/
│     ├─ department-mapping/
│     ├─ evidence/
│     ├─ execution-gateway/
│     └─ workflow/
└─ package.json
```

## v1 收尾建议

项目已具备阶段性完结基础。后续若继续推进，建议先做独立的 Sprint 22 specs，而不是在 v1 closure 中混入新的真实执行能力。
