'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function ConversationListClient() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)

  const handleNewConversation = async () => {
    setIsCreating(true)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新对话' }),
      })
      if (!response.ok) throw new Error('创建对话失败')
      const conversation = await response.json()
      router.push(`/c/${conversation.id}`)
    } catch {
      // Silently fail - user can retry
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <button
      onClick={handleNewConversation}
      disabled={isCreating}
      className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
    >
      {isCreating ? '创建中...' : '新建'}
    </button>
  )
}
