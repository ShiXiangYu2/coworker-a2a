import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ConversationListClient } from './conversation-list-client'

export const dynamic = 'force-dynamic'

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function HomePage() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      messages: {
        take: 1,
        orderBy: { createdAt: 'desc' },
        select: { content: true, role: true },
      },
      _count: {
        select: { messages: true, tasks: true },
      },
    },
  })

  const latestConversation = conversations[0]
  const totalMessages = conversations.reduce((total, item) => total + item._count.messages, 0)
  const totalTasks = conversations.reduce((total, item) => total + item._count.tasks, 0)

  return (
    <main className="flex min-h-screen bg-[#FAF5FF]">
      {/* ===== Sidebar ===== */}
      <aside className="hidden w-80 shrink-0 border-r border-[#DDD6FE] bg-white md:flex md:flex-col">
        <div className="flex items-center justify-between border-b border-[#DDD6FE] px-4 py-3">
          <div>
            <h2 className="font-heading text-sm font-semibold text-[#1E1B4B]">对话列表</h2>
            <p className="mt-0.5 text-xs text-[#64748B]">{conversations.length} 个本地会话</p>
          </div>
          <ConversationListClient />
        </div>
        <ConversationList conversations={conversations} />
      </aside>

      {/* ===== Main Content ===== */}
      <section className="flex min-w-0 flex-1 flex-col bg-[#FAF5FF]">
        {/* Mobile Header */}
        <header className="border-b border-[#DDD6FE] bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="font-heading text-base font-semibold text-[#1E1B4B]">CoWorker+A2A</h1>
              <p className="text-xs text-[#64748B]">ChatHub 本地工作台</p>
            </div>
            <ConversationListClient />
          </div>
        </header>

        {/* Hero Section */}
        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8">
          <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              {/* AI Badge */}
              <div className="inline-flex items-center gap-2 rounded-full bg-[#7C3AED]/10 px-3 py-1">
                <span className="flex h-2 w-2 rounded-full bg-[#7C3AED] animate-pulse" />
                <span className="text-xs font-medium text-[#7C3AED]">v1 本地治理闭环</span>
              </div>

              {/* Main Headline */}
              <h1 className="mt-5 max-w-2xl font-heading text-3xl font-bold tracking-tight text-[#1E1B4B] sm:text-4xl">
                从需求到 Agent 协作证据
              </h1>
              <p className="mt-2 max-w-2xl font-heading text-xl font-medium text-[#7C3AED]">
                一条可审计的本地链路
              </p>

              {/* Description */}
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#64748B] sm:text-base">
                ChatHub 用来接收需求、保留对话上下文，并把任务、分析、工具提案、工作流提案、证据和人工审批记录串成可回放的治理视图。
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {latestConversation ? (
                  <Link
                    href={`/c/${latestConversation.id}`}
                    className="btn-primary"
                  >
                    继续最近对话
                  </Link>
                ) : (
                  <ConversationListClient />
                )}
                <Link
                  href="/operator#overview"
                  className="btn-secondary"
                >
                  打开 Operator Console
                </Link>
                <Link
                  href="/operator#runtime"
                  className="btn-secondary"
                >
                  查看运行时只读视图
                </Link>
              </div>

              {/* Metrics */}
              <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                <Metric label="本地会话" value={conversations.length} icon="chat" />
                <Metric label="消息记录" value={totalMessages} icon="message" />
                <Metric label="关联任务" value={totalTasks} icon="task" />
              </div>
            </div>

            {/* Recent Conversations Card */}
            <div className="card md:hidden lg:block">
              <div className="flex items-center gap-2 border-b border-[#DDD6FE] pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C3AED]/10">
                  <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-heading text-sm font-semibold text-[#1E1B4B]">最近对话</h2>
                  <p className="text-xs text-[#64748B]">移动端也可以直接进入已有会话。</p>
                </div>
              </div>
              <ConversationList conversations={conversations} compact />
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

type ConversationWithPreview = {
  id: string
  title: string
  updatedAt: Date
  messages: { content: string; role: string }[]
  _count: { messages: number; tasks: number }
}

function ConversationList({
  conversations,
  compact = false,
}: {
  conversations: ConversationWithPreview[]
  compact?: boolean
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#7C3AED]/10">
          <svg className="h-6 w-6 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="mt-4 font-heading text-sm font-semibold text-[#1E1B4B]">暂无对话</p>
        <p className="mt-1 text-xs leading-5 text-[#64748B]">新建一个对话，把需求交给 ChatHub。</p>
      </div>
    )
  }

  return (
    <div className={compact ? 'max-h-[420px] overflow-y-auto p-2' : 'flex-1 overflow-y-auto p-2'}>
      {conversations.map((conversation) => {
        const lastMessage = conversation.messages[0]

        return (
          <Link
            key={conversation.id}
            href={`/c/${conversation.id}`}
            className="mb-1 block rounded-xl px-3 py-2.5 text-left transition-colors duration-200 hover:bg-[#ECEEF9]"
          >
            <div className="truncate font-heading text-sm font-medium text-[#1E1B4B]">
              {conversation.title}
            </div>
            {lastMessage && (
              <div className="mt-1 truncate text-xs text-[#64748B]">
                {lastMessage.role === 'user' ? '你：' : 'AI：'}
                {lastMessage.content.slice(0, 64)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-[#64748B]">
              <span>{conversation._count.messages} 条消息</span>
              {conversation._count.tasks > 0 && (
                <span className="rounded-md bg-[#7C3AED]/10 px-1.5 py-0.5 text-[#7C3AED]">
                  {conversation._count.tasks} 个任务
                </span>
              )}
              <span>{formatDate(conversation.updatedAt)}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function Metric({ label, value, icon }: { label: string; value: number; icon: string }) {
  const iconMap: Record<string, JSX.Element> = {
    chat: (
      <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    message: (
      <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    task: (
      <svg className="h-4 w-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  }

  return (
    <div className="rounded-xl border border-[#DDD6FE] bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        {iconMap[icon]}
        <span className="text-xs text-[#64748B]">{label}</span>
      </div>
      <div className="mt-1 font-heading text-2xl font-bold text-[#1E1B4B]">{value}</div>
    </div>
  )
}
