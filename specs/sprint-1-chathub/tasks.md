# Tasks: Sprint 1 — ChatHub 地基

> 垂直切片任务列表 · 每个任务端到端可交付

---

## TASK-001：项目初始化

**优先级**：high
**垂直切片**：是（项目骨架 + 数据库 + 开发环境）

**做什么**：
- 创建 Next.js 16 项目（TypeScript + Tailwind）
- 配置 Prisma + SQLite
- 定义 Conversation 和 Message 数据模型
- 创建 `.env.example`
- 验证 `npm run dev` 能启动

**验收标准**：
- [ ] `npm run dev` 能在 localhost:3000 启动
- [ ] `npx prisma db push` 能创建 SQLite 数据库
- [ ] Prisma schema 包含 Conversation 和 Message 模型
- [ ] `.env.example` 包含 DATABASE_URL、ANTHROPIC_API_KEY、LLM_PROVIDER

---

## TASK-002：LLM Provider 层

**优先级**：high
**垂直切片**：是（类型定义 + Mock + Claude + 测试）

**做什么**：
- 定义 LLMProvider 接口（streamChat 方法）
- 实现 MockProvider（返回固定流式响应）
- 实现 ClaudeProvider（调用 @anthropic-ai/sdk）
- 实现 Provider 工厂（环境变量切换）
- 编写单元测试

**验收标准**：
- [ ] MockProvider 能返回正确的 SSE 格式流式响应
- [ ] ClaudeProvider 能调用 Claude API 并返回流式响应
- [ ] `LLM_PROVIDER=mock` 时使用 MockProvider
- [ ] `LLM_PROVIDER=claude` + 有效 API Key 时使用 ClaudeProvider
- [ ] 单元测试覆盖 Provider 工厂和 MockProvider

---

## TASK-003：Chat API（流式）

**优先级**：high
**垂直切片**：是（API Route + DB 写入 + 流式响应）

**做什么**：
- 创建 POST /api/chat API Route
- 接收 conversationId（可选）+ message
- conversationId 为空时自动创建新对话（标题=消息前 50 字）
- 存储 user message 到 DB
- 调用 LLM Provider 流式响应
- 流式转发给前端（SSE 格式）
- 流结束后存储 assistant message 到 DB（status=complete）
- 流中断时存储部分内容到 DB（status=incomplete）
- 错误处理（API Key 无效、LLM 超时等）

**验收标准**：
- [ ] POST /api/chat 返回 SSE 流式响应
- [ ] conversationId 为空时自动创建新对话
- [ ] user message 在调用 LLM 前已写入 DB
- [ ] assistant message 在流结束后写入 DB（status=complete）
- [ ] 流中断时 assistant message 写入 DB（status=incomplete）
- [ ] API Key 无效时返回 401 错误
- [ ] LLM 超时时返回 504 错误

---

## TASK-004：Conversation API

**优先级**：medium
**垂直切片**：是（API + DB 查询）

**做什么**：
- 创建 GET /api/conversations（对话列表）
- 创建 GET /api/conversations/:id/messages（消息历史）
- 新对话自动创建（首条消息时）

**验收标准**：
- [ ] GET /api/conversations 返回按时间排序的对话列表
- [ ] GET /api/conversations/:id/messages 返回指定对话的消息
- [ ] 首次发送消息时自动创建新对话

---

## TASK-005：ChatHub UI — 消息列表

**优先级**：high
**垂直切片**：是（组件 + 样式 + 渲染）

**做什么**：
- 创建 MessageList 组件
- 创建 MessageBubble 组件（区分用户/Claude 消息）
- Markdown 渲染（react-markdown + rehype-highlight）
- 消息时间戳显示
- 自动滚动到底部

**验收标准**：
- [ ] 用户消息靠右（蓝色背景），Claude 回复靠左（灰色背景）
- [ ] Markdown 正确渲染（代码块、列表、加粗）
- [ ] 代码块有语法高亮
- [ ] 新消息出现时自动滚动到底部
- [ ] 每条消息显示时间戳

---

## TASK-006：ChatHub UI — 输入框

**优先级**：high
**垂直切片**：是（组件 + 交互）

**做什么**：
- 创建 ChatInput 组件
- 多行输入（textarea）
- Enter 发送，Shift+Enter 换行
- 发送后清空输入框
- Loading 状态（Claude 生成中禁用输入）

**依赖安装**：
```bash
npm install react-markdown rehype-highlight isomorphic-dompurify
npm install -D @types/dompurify
```

**验收标准**：
- [ ] 输入框支持多行文本
- [ ] Enter 发送消息
- [ ] Shift+Enter 换行
- [ ] 发送后输入框清空
- [ ] Claude 生成中显示 loading 状态，输入框禁用

---

## TASK-007：ChatHub UI — 主页面整合

**优先级**：high
**垂直切片**：是（页面 + 组件整合 + API 对接）

**做什么**：
- 创建 ChatHub 主页面（page.tsx）
- 整合 MessageList + ChatInput
- 实现"新建对话"按钮（清空消息列表，创建新对话）
- 对接 /api/chat（fetch + SSE 读取）
- 对接 /api/conversations/:id/messages（加载历史）
- 流式渲染（逐字输出）
- 错误提示

**验收标准**：
- [ ] 用户输入消息 → Claude 流式回复 → 消息出现在列表
- [ ] 刷新页面后对话历史仍在
- [ ] 点击"新建对话"按钮后清空消息列表，创建新对话
- [ ] SSE 连接中断时显示错误提示
- [ ] 空对话时显示欢迎提示

---

## TASK-008：System Prompt 配置

**优先级**：medium
**垂直切片**：是（配置 + 注入）

**做什么**：
- 从环境变量 SYSTEM_PROMPT 读取 System Prompt
- 默认 System Prompt（中文，专业简洁）
- 注入到 Claude API 调用中

**验收标准**：
- [ ] 未设置 SYSTEM_PROMPT 时使用默认值
- [ ] 设置 SYSTEM_PROMPT 后 Claude 使用新 Prompt
- [ ] System Prompt 在对话历史中不显示（只发给 LLM）

---

## 依赖关系

```
TASK-001（项目初始化）
    ↓
TASK-002（LLM Provider）──→ TASK-003（Chat API）
    ↓                              ↓
TASK-004（Conversation API）   TASK-005（消息列表）
    ↓                              ↓
    └──────────→ TASK-007（主页面整合）←── TASK-006（输入框）
                      ↓
                 TASK-008（System Prompt）
```

## 执行顺序建议

```
Phase 1（地基）：TASK-001 → TASK-002
Phase 2（API）：TASK-003 → TASK-004
Phase 3（UI）：TASK-005 → TASK-006 → TASK-007
Phase 4（配置）：TASK-008
```

## Eval 验收标准

- [ ] 用户能在 ChatHub 输入消息并收到 Claude 回复
- [ ] 刷新页面后对话历史仍在
- [ ] 响应延迟 < 3 秒（首 token）
- [ ] Claude 的 System Prompt 可配置
