'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ConversationListClient() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNewConversation = async () => {
    setIsCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新对话' }),
      })

      if (!response.ok) throw new Error('创建对话失败')

      const conversation = await response.json()
      router.push(`/c/${conversation.id}`)
      router.refresh()
    } catch {
      setError('创建失败，请重试')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600">{error}</span>}
      <button
        onClick={handleNewConversation}
        disabled={isCreating}
        className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isCreating ? '创建中...' : '新建'}
      </button>
    </div>
  )
}
