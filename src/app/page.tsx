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

  return (
    <main className="flex min-h-screen bg-white text-gray-950">
      <aside className="hidden w-80 shrink-0 border-r border-gray-200 bg-gray-50 md:flex md:flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">对话列表</h2>
            <p className="mt-0.5 text-xs text-gray-500">{conversations.length} 个本地会话</p>
          </div>
          <ConversationListClient />
        </div>
        <ConversationList conversations={conversations} />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-gray-950">CoWorker+A2A</h1>
              <p className="text-xs text-gray-500">ChatHub 本地工作台</p>
            </div>
            <ConversationListClient />
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-center px-4 py-8 sm:px-8">
          <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600">
                v1 本地治理闭环
              </div>
              <h1 className="mt-5 max-w-2xl text-3xl font-semibold tracking-normal text-gray-950 sm:text-4xl">
                从需求到 Agent 协作证据，一条可审计的本地链路
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                ChatHub 用来接收需求、保留对话上下文，并把任务、分析、工具提案、工作流提案、证据和人工审批记录串成可回放的治理视图。
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {latestConversation ? (
                  <Link
                    href={`/c/${latestConversation.id}`}
                    className="rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                  >
                    继续最近对话
                  </Link>
                ) : (
                  <ConversationListClient />
                )}
                <Link
                  href="/operator#overview"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100"
                >
                  打开 Operator Console
                </Link>
                <Link
                  href="/operator#runtime"
                  className="rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-100"
                >
                  查看运行时只读视图
                </Link>
              </div>

              <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-3">
                <Metric label="本地会话" value={conversations.length} />
                <Metric
                  label="消息记录"
                  value={conversations.reduce((total, item) => total + item._count.messages, 0)}
                />
                <Metric
                  label="关联任务"
                  value={conversations.reduce((total, item) => total + item._count.tasks, 0)}
                />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white shadow-sm md:hidden lg:block">
              <div className="border-b border-gray-200 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">最近对话</h2>
                <p className="mt-1 text-xs text-gray-500">移动端也可以直接进入已有会话。</p>
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
        <div className="rounded-full bg-gray-100 px-4 py-3 text-2xl">+</div>
        <p className="mt-4 text-sm font-medium text-gray-800">暂无对话</p>
        <p className="mt-1 text-xs leading-5 text-gray-500">新建一个对话，把需求交给 ChatHub。</p>
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
            className="mb-1 block rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-100"
          >
            <div className="truncate font-medium text-gray-900">{conversation.title}</div>
            {lastMessage && (
              <div className="mt-1 truncate text-xs text-gray-500">
                {lastMessage.role === 'user' ? '你：' : 'AI：'}
                {lastMessage.content.slice(0, 64)}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
              <span>{conversation._count.messages} 条消息</span>
              {conversation._count.tasks > 0 && (
                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-sky-700">
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-950">{value}</div>
    </div>
  )
}
