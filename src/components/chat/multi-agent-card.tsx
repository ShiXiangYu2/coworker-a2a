/**
 * 多 Agent 协作状态卡片
 *
 * 展示 CEO 分解、各 Agent 执行状态、汇总进度
 */

const agentLabels: Record<string, string> = {
  jobs: 'Jobs / Product',
  linus: 'Linus / Engineering',
  turing: 'Turing / Verification',
  bezos: 'Bezos / Customer',
}

const agentColors: Record<string, string> = {
  jobs: 'bg-blue-100 text-blue-800 ring-blue-200',
  linus: 'bg-green-100 text-green-800 ring-green-200',
  turing: 'bg-purple-100 text-purple-800 ring-purple-200',
  bezos: 'bg-orange-100 text-orange-800 ring-orange-200',
}

export interface SubTaskInfo {
  agentId: string
  title: string
  dependsOn: number[]
}

export interface AgentResultInfo {
  agentId: string
  agentName: string
  title: string
  status: 'completed' | 'failed' | 'timeout'
  confidence: number
  summary: string
  findings: string[]
  durationMs: number
}

interface MultiAgentCardProps {
  reasoning?: string
  subtasks?: SubTaskInfo[]
  agentResults?: AgentResultInfo[]
  isExecuting?: boolean
  isSummarizing?: boolean
}

export function MultiAgentCard({
  reasoning,
  subtasks = [],
  agentResults = [],
  isExecuting = false,
  isSummarizing = false,
}: MultiAgentCardProps) {
  if (!reasoning && subtasks.length === 0) return null

  return (
    <section className="border-b bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 text-sm text-indigo-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="font-semibold">🤖 Multi-Agent Collaboration</span>
          {isExecuting && (
            <span className="animate-pulse rounded bg-indigo-200 px-2 py-0.5 text-xs font-medium text-indigo-700">
              Executing...
            </span>
          )}
          {isSummarizing && (
            <span className="animate-pulse rounded bg-purple-200 px-2 py-0.5 text-xs font-medium text-purple-700">
              Summarizing...
            </span>
          )}
        </div>

        {/* Reasoning */}
        {reasoning && (
          <div className="text-xs text-indigo-700">
            <span className="font-medium">CEO Analysis:</span> {reasoning}
          </div>
        )}

        {/* Sub-tasks */}
        {subtasks.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {subtasks.map((st, idx) => {
              const result = agentResults.find((r) => r.agentId === st.agentId && r.title === st.title)
              const colorClass = agentColors[st.agentId] ?? 'bg-gray-100 text-gray-800 ring-gray-200'

              return (
                <div
                  key={`${st.agentId}-${idx}`}
                  className={`rounded-lg px-3 py-2 ring-1 ${colorClass}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {agentLabels[st.agentId] ?? st.agentId}
                    </span>
                    {result && (
                      <span className={`text-xs ${
                        result.status === 'completed' ? 'text-green-600' :
                        result.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {result.status === 'completed' ? '✅' :
                         result.status === 'failed' ? '❌' : '⏱️'}
                      </span>
                    )}
                    {!result && isExecuting && (
                      <span className="animate-spin text-xs">⏳</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs opacity-75">{st.title}</div>
                  {st.dependsOn.length > 0 && (
                    <div className="mt-1 text-xs opacity-50">
                      depends on: {st.dependsOn.map((d) => `#${d + 1}`).join(', ')}
                    </div>
                  )}
                  {result && (
                    <div className="mt-2 border-t border-current/10 pt-2">
                      <div className="text-xs font-medium">{result.summary}</div>
                      {result.findings.length > 0 && (
                        <ul className="mt-1 list-inside list-disc text-xs opacity-75">
                          {result.findings.slice(0, 3).map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-1 text-xs opacity-50">
                        {(result.confidence * 100).toFixed(0)}% confidence · {result.durationMs}ms
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
