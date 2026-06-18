import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ConversationListClient } from './conversation-list-client'

export const dynamic = 'force-dynamic'

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

  return (
    <div className="flex h-screen bg-white text-gray-950">
      {/* 左侧对话列表 */}
      <aside className="hidden w-80 shrink-0 border-r bg-gray-50 md:flex md:flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">对话列表</h2>
          <ConversationListClient />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm">暂无对话</p>
              <p className="text-xs mt-1">点击上方按钮新建对话</p>
            </div>
          ) : (
            conversations.map((conversation) => {
              const lastMessage = conversation.messages[0]
              return (
                <Link
                  key={conversation.id}
                  href={`/c/${conversation.id}`}
                  className="mb-1 block w-full truncate rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-gray-200"
                >
                  <div className="font-medium text-gray-800 truncate">
                    {conversation.title}
                  </div>
                  {lastMessage && (
                    <div className="mt-1 truncate text-xs text-gray-500">
                      {lastMessage.role === 'user' ? '你: ' : 'AI: '}
                      {lastMessage.content.slice(0, 60)}
                    </div>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{conversation._count.messages} 条消息</span>
                    {conversation._count.tasks > 0 && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-600">
                        {conversation._count.tasks} 个任务
                      </span>
                    )}
                    <span>
                      {new Date(conversation.updatedAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                </Link>
              )
            })
          )}
        </div>
      </aside>

      {/* 右侧欢迎区域 */}
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="mb-6 text-6xl">🤖</div>
          <h1 className="text-2xl font-semibold text-gray-900">
            CoWorker+A2A ChatHub
          </h1>
          <p className="mt-2 max-w-md text-sm text-gray-500">
            基于多 Agent 协作的个人 AI 生产系统。选择左侧对话或新建对话开始。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/operator"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700"
            >
              Operator Console
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
