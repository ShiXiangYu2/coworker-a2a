'use client'

import Markdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  status?: string
  createdAt: string
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isIncomplete = message.status === 'incomplete'

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-pre:bg-gray-800 prose-pre:text-gray-100">
            <Markdown rehypePlugins={[rehypeHighlight]}>
              {message.content}
            </Markdown>
          </div>
        )}

        {/* 时间戳 */}
        <div
          className={`text-xs mt-1 ${
            isUser ? 'text-blue-100' : 'text-gray-500'
          }`}
        >
          {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
          {isIncomplete && (
            <span className="ml-2 text-yellow-500">（未完成）</span>
          )}
        </div>
      </div>
    </div>
  )
}
