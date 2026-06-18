import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ChatClient } from './chat-client'

export const dynamic = 'force-dynamic'

interface ConversationPageProps {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!conversation) {
    notFound()
  }

  return (
    <ChatClient
      conversationId={conversation.id}
      conversationTitle={conversation.title}
      initialMessages={conversation.messages.map((msg) => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        status: msg.status,
        createdAt: msg.createdAt.toISOString(),
      }))}
    />
  )
}
