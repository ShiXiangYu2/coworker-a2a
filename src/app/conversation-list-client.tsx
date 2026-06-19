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
      {error && <span className="text-xs text-[#DC2626]">{error}</span>}
      <button
        onClick={handleNewConversation}
        disabled={isCreating}
        className="btn-primary flex items-center gap-2 !px-3 !py-1.5 !text-xs"
      >
        {isCreating ? (
          <>
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            创建中...
          </>
        ) : (
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            新建
          </>
        )}
      </button>
    </div>
  )
}
