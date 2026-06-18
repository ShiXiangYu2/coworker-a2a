'use client'

import { useState, useRef, useEffect } from 'react'
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

export function ChatClient({ conversationId, conversationTitle, initialMessages }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setIsLoading(true)

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: text }),
      })

      if (!res.ok) throw new Error('请求失败')

      const reader = res.body?.getReader()
      if (!reader) return

      const decoder = new TextDecoder()
      let assistantContent = ''
      let assistantId = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          try {
            const event = JSON.parse(data)

            if (event.type === 'delta' && event.content) {
              assistantContent += event.content
              setMessages((prev) => {
                const updated = [...prev]
                const last = updated[updated.length - 1]
                if (last && last.role === 'assistant' && last.id.startsWith('stream-')) {
                  updated[updated.length - 1] = { ...last, content: assistantContent }
                } else {
                  updated.push({
                    id: `stream-${Date.now()}`,
                    role: 'assistant',
                    content: assistantContent,
                    status: 'streaming',
                    createdAt: new Date().toISOString(),
                  })
                }
                return updated
              })
            }

            if (event.type === 'done' && event.messageId) {
              assistantId = event.messageId
            }
          } catch {
            // Skip non-JSON lines
          }
        }
      }

      if (assistantId) {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last && last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, id: assistantId, status: 'complete' }
          }
          return updated
        })
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '抱歉，发生了错误。请重试。',
          status: 'error',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex h-screen flex-col bg-white text-gray-950">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← 返回
        </Link>
        <h1 className="text-sm font-semibold text-gray-800 truncate">{conversationTitle}</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <p className="text-sm">发送消息开始对话</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入消息..."
            disabled={isLoading}
            className="flex-1 rounded-lg border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {isLoading ? '...' : '发送'}
          </button>
        </form>
      </div>
    </div>
  )
}
