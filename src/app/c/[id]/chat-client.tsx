'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status: string
  createdAt: string
}

interface ChatClientProps {
  conversationId: string
  conversationTitle: string
  initialMessages: Message[]
}

export function ChatClient({
  conversationId,
  conversationTitle,
  initialMessages,
}: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)
    setError(null)

    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      status: 'complete',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ conversationId, message: text }),
      })

      if (!res.ok) throw new Error('请求失败')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('响应流不可用')

      const decoder = new TextDecoder()
      let assistantContent = ''
      let assistantId = ''
      let streamBuffer = ''
      let streamDone = false
      const streamId = `stream-${Date.now()}`

      const processStreamBuffer = () => {
        const blocks = streamBuffer.split('\n\n')
        streamBuffer = blocks.pop() ?? ''

        for (const block of blocks) {
          const data = block
            .split('\n')
            .filter((line) => line.startsWith('data: '))
            .map((line) => line.slice(6))
            .join('\n')

          if (!data) continue

          let event: { type?: string; content?: string; error?: string; messageId?: string }
          try {
            event = JSON.parse(data)
          } catch {
            continue
          }

          if (event.type === 'delta' && event.content) {
            assistantContent += event.content
            setMessages((prev) => {
              const existing = prev.find((msg) => msg.id === streamId)
              if (existing) {
                return prev.map((msg) =>
                  msg.id === streamId ? { ...msg, content: assistantContent } : msg
                )
              }

              return [
                ...prev,
                {
                  id: streamId,
                  role: 'assistant',
                  content: assistantContent,
                  status: 'streaming',
                  createdAt: new Date().toISOString(),
                },
              ]
            })
          }

          if (event.type === 'error' && event.error) {
            setError(String(event.error))
          }

          if (event.type === 'done') {
            if (event.messageId) {
              assistantId = event.messageId
            }
            streamDone = true
          }
        }
      }

      while (!streamDone) {
        const { done, value } = await reader.read()
        if (done) break

        streamBuffer += decoder.decode(value, { stream: true })
        processStreamBuffer()
      }

      streamBuffer += decoder.decode()
      if (streamBuffer.trim()) {
        streamBuffer += '\n\n'
        processStreamBuffer()
      }

      if (streamDone) {
        await reader.cancel().catch(() => undefined)
      }

      if (assistantId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamId ? { ...msg, id: assistantId, status: 'complete' } : msg
          )
        )
      } else if (assistantContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamId ? { ...msg, status: 'complete' } : msg
          )
        )
      }
    } catch {
      setError('消息发送失败，请检查本地服务后重试。')
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，本次请求没有成功。你可以稍后重试，已有对话记录不会丢失。',
          status: 'error',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex h-screen flex-col bg-white text-gray-950">
      <header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link href="/" className="shrink-0 text-sm font-medium text-gray-500 hover:text-gray-900">
            返回
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-gray-900">{conversationTitle}</h1>
            <p className="text-xs text-gray-500">ChatHub · 本地治理记录优先</p>
          </div>
        </div>
        <Link
          href="/operator"
          className="hidden rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:block"
        >
          Operator Console
        </Link>
      </header>

      <section className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto flex h-full max-w-xl flex-col items-center justify-center text-center">
            <div className="rounded-full bg-gray-100 px-4 py-3 text-2xl">+</div>
            <h2 className="mt-4 text-lg font-semibold text-gray-950">发送第一条需求</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              描述你要完成的工作，系统会保留对话上下文，并在本地生成可审计的任务和协作记录。
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isLoading && (
              <div className="mb-4 flex justify-start">
                <div className="rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-500">
                  AI 正在回复...
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </section>

      <footer className="border-t border-gray-200 bg-white px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void handleSend()
          }}
          className="mx-auto max-w-3xl"
        >
          {error && (
            <div className="mb-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend()
                }
              }}
              placeholder="输入需求或补充上下文，Enter 发送，Shift+Enter 换行"
              disabled={isLoading}
              rows={1}
              className="max-h-36 min-h-11 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm leading-6 outline-none transition-colors focus:border-gray-500 disabled:bg-gray-50 disabled:text-gray-400"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="h-11 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '发送中' : '发送'}
            </button>
          </div>
        </form>
      </footer>
    </main>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'

  return (
    <div className={`mb-4 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] rounded-xl px-4 py-2.5 text-sm leading-6 shadow-sm sm:max-w-[75%] ${
          isUser
            ? 'bg-gray-900 text-white'
            : isError
              ? 'border border-rose-200 bg-rose-50 text-rose-800'
              : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{message.content}</div>
      </div>
    </div>
  )
}
