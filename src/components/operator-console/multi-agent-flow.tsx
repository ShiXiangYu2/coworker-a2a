'use client'

import { useCallback, useEffect, useState } from 'react'
import { EmptyState, LoadingState, PanelShell, StatusBadge } from './ui'

interface Message {
  id: string
  role: string
  content: string
  createdAt: string
}

interface FlowStep {
  type: 'decomposition' | 'agent_result' | 'summary'
  agentId?: string
  agentName?: string
  title?: string
  summary?: string
  confidence?: number
  status?: string
  findings?: string[]
}

const agentColors: Record<string, string> = {
  jobs: 'border-sky-300 bg-sky-50',
  linus: 'border-emerald-300 bg-emerald-50',
  turing: 'border-violet-300 bg-violet-50',
  bezos: 'border-amber-300 bg-amber-50',
}

const agentLabels: Record<string, string> = {
  jobs: 'Jobs',
  linus: 'Linus',
  turing: 'Turing',
  bezos: 'Bezos',
}

export function MultiAgentFlow() {
  const [flows, setFlows] = useState<{ reasoning: string; steps: FlowStep[] }[]>([])
  const [loading, setLoading] = useState(true)

  const extractSteps = useCallback((content: string): FlowStep[] => {
    const steps: FlowStep[] = []
    const agentPattern = /(?:Jobs|Linus|Turing|Bezos)\s*\((\w+)\)/g
    let match
    while ((match = agentPattern.exec(content)) !== null) {
      const agentId = match[1].toLowerCase()
      steps.push({
        type: 'agent_result',
        agentId,
        agentName: match[0].split('(')[0].trim(),
        summary: content.slice(match.index, Math.min(match.index + 100, content.length)),
        status: 'completed',
      })
    }
    return steps
  }, [])

  const fetchAndParse = useCallback(async () => {
    try {
      const convRes = await fetch('/api/conversations')
      if (!convRes.ok) return
      const conversations = await convRes.json()

      const parsedFlows: { reasoning: string; steps: FlowStep[] }[] = []

      for (const conv of (conversations ?? []).slice(0, 5)) {
        const msgRes = await fetch(`/api/conversations/${conv.id}/messages`)
        if (!msgRes.ok) continue
        const messages: Message[] = await msgRes.json()

        for (const msg of messages) {
          if (msg.role !== 'assistant') continue
          if (msg.content.includes('Multi-Agent') || msg.content.includes('多 Agent') || msg.content.includes('协作分析')) {
            const steps = extractSteps(msg.content)
            if (steps.length > 0) {
              parsedFlows.push({
                reasoning: `${msg.content.slice(0, 100)}...`,
                steps,
              })
            }
          }
        }
      }

      setFlows(parsedFlows.slice(0, 5))
    } catch {
      // Derived view only.
    } finally {
      setLoading(false)
    }
  }, [extractSteps])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchAndParse()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [fetchAndParse])

  if (loading) {
    return <LoadingState label="正在读取多 Agent 协作记录..." />
  }

  return (
    <PanelShell
      title="多 Agent 协作流"
      description={`${flows.length} 条最近协作记录。这里展示已产生的本地消息和分析结果，不启动新的 Agent 协作。`}
    >
      <div className="max-h-96 overflow-y-auto p-4">
        {flows.length === 0 ? (
          <EmptyState
            title="暂无多 Agent 协作记录"
            description="在 ChatHub 中产生多 Agent 分析后，这里会展示最近的协作拆解和本地结果。"
          />
        ) : (
          <div className="space-y-4">
            {flows.map((flow, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">Flow #{index + 1}</span>
                  <StatusBadge status="review" />
                </div>
                <div className="mb-3 break-words text-sm leading-6 text-gray-700">{flow.reasoning}</div>
                <div className="flex flex-wrap gap-2">
                  {flow.steps.map((step, stepIndex) => (
                    <div
                      key={stepIndex}
                      className={`min-w-0 rounded-lg border-2 px-3 py-2 text-xs ${agentColors[step.agentId ?? ''] ?? 'border-gray-200 bg-gray-50'}`}
                    >
                      <div className="font-semibold">
                        {agentLabels[step.agentId ?? ''] ?? step.agentName ?? step.agentId}
                      </div>
                      {step.summary && (
                        <div className="mt-1 max-w-48 truncate text-gray-600">{step.summary}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PanelShell>
  )
}
