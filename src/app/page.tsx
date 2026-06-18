'use client'

import { useState, useCallback, useEffect } from 'react'
import { MessageList, type Message } from '@/components/chat/message-list'
import { ChatInput } from '@/components/chat/chat-input'
import { RouteDecisionCard } from '@/components/chat/route-decision-card'
import { HarmonyTaskCard } from '@/components/chat/harmony-task-card'
import { AgentResultCard } from '@/components/chat/agent-result-card'
import { DeliverableCard } from '@/components/chat/deliverable-card'
import { ReviewCard } from '@/components/chat/review-card'
import type { Deliverable, AgentReview } from '@/lib/agents/types'
import { ToolCallCard } from '@/components/chat/tool-call-card'
import { EvalResultCard } from '@/components/chat/eval-result-card'
import { CollaborationSessionCard } from '@/components/chat/collaboration-session-card'
import { ProductionSecurityCard } from '@/components/chat/production-security-card'
import { FileGitPrCard } from '@/components/chat/file-git-pr-card'
import { ExternalMcpGovernanceCard } from '@/components/chat/external-mcp-governance-card'
import { WorkflowProposalCard } from '@/components/chat/workflow-proposal-card'
import { MVPClosureCard } from '@/components/chat/mvp-closure-card'
import { MultiAgentCard, type SubTaskInfo, type AgentResultInfo } from '@/components/chat/multi-agent-card'
import type { RouteDecision } from '@/lib/agents/types'
import type { HarmonyTaskBundle } from '@/lib/harmony/types'
import type { AgentRunBundle } from '@/lib/agent-runtime/types'
import type { A2AMessage, ContextPacket, MemoryEntry } from '@/lib/memory/types'
import type { ToolCallBundle } from '@/lib/tools/types'
import type { EvalRunBundle } from '@/lib/eval/types'
import type { CollaborationSession } from '@/lib/collaboration/types'
import type { FileChangeProposal } from '@/lib/file-git-pr/types'
import type { ExternalActionProposal } from '@/lib/external-mcp-governance/types'
import type {
  WorkflowDependencyGraph,
  WorkflowProposal,
  WorkflowReadinessAssessment,
  WorkflowReviewRecord,
  WorkflowStepRecord,
} from '@/lib/workflow/types'
import type {
  DemoScenarioRecord,
  GovernanceSummaryRecord,
  MVPReadinessRecord,
  MVPReviewRecord,
} from '@/lib/mvp-closure/types'

interface ConversationSummary {
  id: string
  title: string
  updatedAt: string
}

export default function ChatHub() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routeDecision, setRouteDecision] = useState<RouteDecision | null>(null)
  const [lastUserMessageText, setLastUserMessageText] = useState<string>('')
  const [harmonyTaskBundle, setHarmonyTaskBundle] = useState<HarmonyTaskBundle | null>(null)
  const [agentRunBundle, setAgentRunBundle] = useState<AgentRunBundle | null>(null)
  const [contextPackets, setContextPackets] = useState<ContextPacket[]>([])
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>([])
  const [a2aMessages, setA2AMessages] = useState<A2AMessage[]>([])
  const [toolCalls, setToolCalls] = useState<ToolCallBundle[]>([])
  const [evalRuns, setEvalRuns] = useState<EvalRunBundle[]>([])
  const [collaborationSessions, setCollaborationSessions] = useState<CollaborationSession[]>([])
  const [fileChangeProposals, setFileChangeProposals] = useState<FileChangeProposal[]>([])
  const [externalActionProposals, setExternalActionProposals] = useState<ExternalActionProposal[]>([])
  const [workflowProposal, setWorkflowProposal] = useState<WorkflowProposal | null>(null)
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStepRecord[]>([])
  const [workflowGraph, setWorkflowGraph] = useState<WorkflowDependencyGraph | null>(null)
  const [workflowReviews, setWorkflowReviews] = useState<WorkflowReviewRecord[]>([])
  const [workflowAssessments, setWorkflowAssessments] = useState<WorkflowReadinessAssessment[]>([])
  const [mvpReadinessRecord, setMVPReadinessRecord] = useState<MVPReadinessRecord | null>(null)
  const [demoScenarioRecords, setDemoScenarioRecords] = useState<DemoScenarioRecord[]>([])
  const [governanceSummaryRecords, setGovernanceSummaryRecords] = useState<GovernanceSummaryRecord[]>([])
  const [mvpReviewRecords, setMVPReviewRecords] = useState<MVPReviewRecord[]>([])
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isUpdatingTask, setIsUpdatingTask] = useState(false)
  const [isRunningAgent, setIsRunningAgent] = useState(false)
  const [isBuildingContext, setIsBuildingContext] = useState(false)
  const [isCreatingMemory, setIsCreatingMemory] = useState(false)
  const [isDraftingA2A, setIsDraftingA2A] = useState(false)
  const [isProposingTool, setIsProposingTool] = useState(false)
  const [isUpdatingTool, setIsUpdatingTool] = useState(false)
  const [isRunningVerification, setIsRunningVerification] = useState(false)
  const [isCreatingCollaboration, setIsCreatingCollaboration] = useState(false)
  const [isCreatingFileProposal, setIsCreatingFileProposal] = useState(false)
  const [isCreatingExternalProposal, setIsCreatingExternalProposal] = useState(false)
  const [isCreatingWorkflowProposal, setIsCreatingWorkflowProposal] = useState(false)
  const [isCreatingMVPClosure, setIsCreatingMVPClosure] = useState(false)
  const [multiAgentReasoning, setMultiAgentReasoning] = useState<string | undefined>()
  const [multiAgentSubtasks, setMultiAgentSubtasks] = useState<SubTaskInfo[]>([])
  const [multiAgentResults, setMultiAgentResults] = useState<AgentResultInfo[]>([])
  const [deliverables, setDeliverables] = useState<{ agentName: string; deliverables: Deliverable[]; summary: string; confidence: number }[]>([])
  const [agentReviews, setAgentReviews] = useState<AgentReview[]>([])
  const [isMultiAgentExecuting, setIsMultiAgentExecuting] = useState(false)
  const [isMultiAgentSummarizing, setIsMultiAgentSummarizing] = useState(false)

  const refreshConversations = useCallback(async () => {
    const response = await fetch('/api/conversations')
    if (!response.ok) return

    const data = (await response.json()) as ConversationSummary[]
    setConversations(data)
    return data
  }, [])

  const loadMessages = useCallback(async (id: string) => {
    const response = await fetch(`/api/conversations/${id}/messages`)
    if (!response.ok) {
      throw new Error('加载对话历史失败')
    }

    const data = (await response.json()) as Message[]
    setMessages(data)
    setConversationId(id)
    setRouteDecision(null)
    setHarmonyTaskBundle(null)
    setAgentRunBundle(null)
    setContextPackets([])
    setMemoryEntries([])
    setA2AMessages([])
    setToolCalls([])
    setEvalRuns([])
    setCollaborationSessions([])
    setFileChangeProposals([])
    setExternalActionProposals([])
    setWorkflowProposal(null)
    setWorkflowSteps([])
    setWorkflowGraph(null)
    setWorkflowReviews([])
    setWorkflowAssessments([])
    setMVPReadinessRecord(null)
    setDemoScenarioRecords([])
    setGovernanceSummaryRecords([])
    setMVPReviewRecords([])
  }, [])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        const list = await refreshConversations()
        if (!cancelled && list?.[0]) {
          await loadMessages(list[0].id)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '加载历史失败')
        }
      } finally {
        if (!cancelled) setIsBooting(false)
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [loadMessages, refreshConversations])

  const handleSend = useCallback(async (content: string) => {
    setError(null)
    setRouteDecision(null)
    setMultiAgentReasoning(undefined)
    setMultiAgentSubtasks([])
    setMultiAgentResults([])
    setDeliverables([])
    setAgentReviews([])
    setIsMultiAgentExecuting(false)
    setIsMultiAgentSummarizing(false)
    setHarmonyTaskBundle(null)
    setAgentRunBundle(null)
    setContextPackets([])
    setMemoryEntries([])
    setA2AMessages([])
    setToolCalls([])
    setEvalRuns([])
    setCollaborationSessions([])
    setFileChangeProposals([])
    setExternalActionProposals([])
    setMVPReadinessRecord(null)
    setDemoScenarioRecords([])
    setGovernanceSummaryRecords([])
    setMVPReviewRecords([])
    setMultiAgentReasoning(undefined)
    setMultiAgentSubtasks([])
    setMultiAgentResults([])
    setIsMultiAgentExecuting(false)
    setIsMultiAgentSummarizing(false)
    setLastUserMessageText(content)
    setIsLoading(true)

    // 立即显示用户消息
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMessage])

    try {
      void fetch('/api/agent-router/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: content }),
      })
        .then(async (routeResponse) => {
          if (!routeResponse.ok) return
          const decision = (await routeResponse.json()) as RouteDecision
          setRouteDecision(decision)
        })
        .catch(() => {
          setRouteDecision({
            status: 'unsupported',
            decisionType: 'unsupported',
            confidence: 0,
            reason: 'CEO Router is unavailable. Normal chat is continuing.',
            matchedSignals: [],
            requiresHumanConfirmation: false,
            next: {
              recommendedAction: 'continue_chat',
              reason: 'Router failure should not block chat.',
            },
            sideEffects: {
              filesChanged: [],
              branchesCreated: [],
              prsCreated: [],
              issuesUpdated: [],
            },
          })
        })

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: content }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '发送失败')
      }

      // 读取 SSE 流
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')

      const decoder = new TextDecoder()
      let assistantContent = ''
      let assistantMessageId = ''
      let buffer = ''

      // 添加空的 assistant 消息
      const tempAssistantId = `temp-assistant-${Date.now()}`
      setMessages((prev) => [
        ...prev,
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          createdAt: new Date().toISOString(),
        },
      ])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const rawEvent of events) {
          for (const line of rawEvent.split('\n')) {
            if (!line.startsWith('data: ')) continue
            try {
              const event = JSON.parse(line.slice(6))

              if (event.type === 'start') {
                if (event.conversationId) {
                  setConversationId(event.conversationId)
                }
              } else if (event.type === 'decomposition') {
                // CEO 分解事件
                setMultiAgentReasoning(event.reasoning)
                setMultiAgentSubtasks(event.subtasks ?? [])
                setMultiAgentResults([])
              } else if (event.type === 'agents_start') {
                // 多 Agent 开始执行
                setIsMultiAgentExecuting(true)
              } else if (event.type === 'agent_result') {
                // 单个 Agent 执行结果
                setMultiAgentResults((prev) => [
                  ...prev,
                  {
                    agentId: event.agentId,
                    agentName: event.agentName,
                    title: event.title,
                    status: event.status,
                    confidence: event.confidence,
                    summary: event.summary,
                    findings: event.findings ?? [],
                    durationMs: event.durationMs ?? 0,
                  },
                ])
              } else if (event.type === 'agents_complete') {
                // 所有 Agent 执行完成
                setIsMultiAgentExecuting(false)
              } else if (event.type === 'deliverable') {
                // Sprint 16: 交付物事件
                setDeliverables((prev) => [
                  ...prev,
                  {
                    agentName: event.agentName,
                    deliverables: event.deliverables ?? [],
                    summary: event.summary ?? '',
                    confidence: event.confidence ?? 0,
                  },
                ])
              } else if (event.type === 'review') {
                // Sprint 20: 审查结果事件
                setAgentReviews((prev) => [...prev, event.review])
              } else if (event.type === 'summarizing') {
                // 开始汇总
                setIsMultiAgentSummarizing(true)
              } else if (event.type === 'route') {
                // 单 Agent 路由事件
                setRouteDecision({
                  status: 'ready',
                  decisionType: event.decisionType,
                  targetAgentId: event.targetAgentId,
                  confidence: event.confidence,
                  reason: event.reason,
                  matchedSignals: [],
                  requiresHumanConfirmation: false,
                  next: {
                    recommendedAction: 'show_route_suggestion',
                    reason: event.reason,
                  },
                  sideEffects: {
                    filesChanged: [],
                    branchesCreated: [],
                    prsCreated: [],
                    issuesUpdated: [],
                  },
                })
              } else if (event.type === 'delta') {
                assistantContent += event.content
                // 更新 assistant 消息
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === tempAssistantId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                )
              } else if (event.type === 'done') {
                if (event.messageId) assistantMessageId = event.messageId
                if (event.conversationId) setConversationId(event.conversationId)
                setIsMultiAgentSummarizing(false)
              } else if (event.type === 'error') {
                setError(event.error)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 用真实 ID 替换临时 ID
      if (assistantMessageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantId
              ? { ...msg, id: assistantMessageId }
              : msg
          )
        )
      }

      await refreshConversations()
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
      // 移除临时 assistant 消息
      setMessages((prev) => prev.filter((msg) => !msg.id.startsWith('temp-assistant-')))
    } finally {
      setIsLoading(false)
    }
  }, [conversationId, refreshConversations])

  const handleCreateHarmonyTask = useCallback(async () => {
    if (!routeDecision || !lastUserMessageText.trim()) return

    setError(null)
    setIsCreatingTask(true)

    try {
      const response = await fetch('/api/harmony/tasks/from-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          sourceMessageText: lastUserMessageText,
          routeDecision,
          idempotencyKey: [
            conversationId ?? 'new-conversation',
            routeDecision.decisionType,
            routeDecision.targetAgentId ?? 'chat',
            lastUserMessageText,
          ].join(':'),
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create Harmony Task.')

      setHarmonyTaskBundle(data as HarmonyTaskBundle)
      setAgentRunBundle(null)
      setContextPackets([])
      setMemoryEntries([])
      setA2AMessages([])
      setToolCalls([])
      setEvalRuns([])
      setCollaborationSessions([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Harmony Task.')
    } finally {
      setIsCreatingTask(false)
    }
  }, [conversationId, lastUserMessageText, routeDecision])

  const refreshSprint5Records = useCallback(async (bundle: AgentRunBundle) => {
    const [packetsResponse, memoryResponse, a2aResponse, toolResponse, collaborationResponse, fileProposalResponse, externalProposalResponse, workflowProposalResponse] = await Promise.all([
      fetch(`/api/agent-runtime/runs/${bundle.agentRun.id}/context-packets`),
      fetch(`/api/memory?agentRunId=${bundle.agentRun.id}`),
      fetch(`/api/a2a/messages?agentRunId=${bundle.agentRun.id}`),
      fetch(`/api/agent-runtime/runs/${bundle.agentRun.id}/tool-calls`),
      fetch(`/api/agent-runtime/runs/${bundle.agentRun.id}/collaboration-sessions`),
      fetch(`/api/agent-runtime/runs/${bundle.agentRun.id}/file-change-proposals`),
      fetch(`/api/agent-runtime/runs/${bundle.agentRun.id}/external-action-proposals`),
      fetch(`/api/agent-runtime/runs/${bundle.agentRun.id}/workflow-proposals`),
    ])

    if (packetsResponse.ok) {
      const packets = await packetsResponse.json()
      setContextPackets(packets.data ?? [])
    }
    if (memoryResponse.ok) {
      const memory = await memoryResponse.json()
      setMemoryEntries(memory.data ?? [])
    }
    if (a2aResponse.ok) {
      const messages = await a2aResponse.json()
      setA2AMessages(messages.data ?? [])
    }
    if (toolResponse.ok) {
      const tools = await toolResponse.json()
      setToolCalls(tools.data ?? [])
    }
    if (collaborationResponse.ok) {
      const sessions = await collaborationResponse.json()
      setCollaborationSessions(sessions.data ?? [])
    }
    if (fileProposalResponse.ok) {
      const proposals = await fileProposalResponse.json()
      setFileChangeProposals(proposals.data ?? [])
    }
    if (externalProposalResponse.ok) {
      const proposals = await externalProposalResponse.json()
      setExternalActionProposals(proposals.data ?? [])
    }
    if (workflowProposalResponse.ok) {
      const proposals = await workflowProposalResponse.json()
      const latest = proposals.data?.[0] ?? null
      setWorkflowProposal(latest)
    }
  }, [])

  const handleRunAgentAnalysis = useCallback(async (taskId: string) => {
    setError(null)
    setIsRunningAgent(true)

    try {
      const response = await fetch('/api/agent-runtime/runs/from-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          trigger: 'task_ui',
          idempotencyKey: `agent-analysis:${taskId}`,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to run Agent Analysis.')

      setAgentRunBundle(data as AgentRunBundle)
      await refreshSprint5Records(data as AgentRunBundle)

      const taskResponse = await fetch(`/api/harmony/tasks/${taskId}`)
      if (taskResponse.ok) {
        setHarmonyTaskBundle((await taskResponse.json()) as HarmonyTaskBundle)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Agent Analysis.')
    } finally {
      setIsRunningAgent(false)
    }
  }, [refreshSprint5Records])

  const handleBuildContextPacket = useCallback(async (agentRunId: string) => {
    if (!agentRunBundle) return
    setError(null)
    setIsBuildingContext(true)
    try {
      const response = await fetch('/api/context-packets/from-agent-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRunId,
          idempotencyKey: `context:${agentRunId}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to build ContextPacket.')
      await refreshSprint5Records(agentRunBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to build ContextPacket.')
    } finally {
      setIsBuildingContext(false)
    }
  }, [agentRunBundle, refreshSprint5Records])

  const handleCreateMemoryCandidate = useCallback(async (agentRunId: string) => {
    if (!agentRunBundle) return
    setError(null)
    setIsCreatingMemory(true)
    try {
      const response = await fetch('/api/memory/candidates/from-agent-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRunId,
          taskId: agentRunBundle.agentRun.taskId,
          agentId: agentRunBundle.agentRun.agentId,
          idempotencyKey: `memory:${agentRunId}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create Memory Candidate.')
      await refreshSprint5Records(agentRunBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Memory Candidate.')
    } finally {
      setIsCreatingMemory(false)
    }
  }, [agentRunBundle, refreshSprint5Records])

  const handleDraftA2AMessage = useCallback(async (agentRunId: string) => {
    if (!agentRunBundle) return
    setError(null)
    setIsDraftingA2A(true)
    try {
      const nextAgent = agentRunBundle.agentRun.result?.next.suggestedNextAgentId ?? 'kelvin'
      const response = await fetch('/api/a2a/messages/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: agentRunBundle.agentRun.taskId,
          agentRunId,
          fromAgentId: agentRunBundle.agentRun.agentId,
          toAgentId: nextAgent,
          intent: nextAgent === 'kelvin' ? 'escalate_to_kelvin' : 'handoff',
          subject: 'Local Agent handoff draft',
          body: agentRunBundle.agentRun.result?.summary ?? 'Local A2A draft from AgentResult.',
          idempotencyKey: `a2a-draft:${agentRunId}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to draft A2A Message.')
      await refreshSprint5Records(agentRunBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to draft A2A Message.')
    } finally {
      setIsDraftingA2A(false)
    }
  }, [agentRunBundle, refreshSprint5Records])

  const handleProposeToolCall = useCallback(async (agentRunId: string) => {
    if (!agentRunBundle) return
    setError(null)
    setIsProposingTool(true)
    try {
      const response = await fetch('/api/tool-calls/from-agent-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRunId,
          idempotencyKey: `tool-proposal:${agentRunId}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to propose ToolCall.')
      await refreshSprint5Records(agentRunBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to propose ToolCall.')
    } finally {
      setIsProposingTool(false)
    }
  }, [agentRunBundle, refreshSprint5Records])

  const refreshToolCalls = useCallback(async () => {
    if (!agentRunBundle) return
    const response = await fetch(`/api/agent-runtime/runs/${agentRunBundle.agentRun.id}/tool-calls`)
    if (response.ok) {
      const data = await response.json()
      setToolCalls(data.data ?? [])
    }
  }, [agentRunBundle])

  const handleEvaluateToolPermission = useCallback(async (toolCallId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-calls/${toolCallId}/evaluate-permission`, {
        method: 'POST',
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to evaluate permission.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to evaluate permission.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleApproveToolRecord = useCallback(async (confirmationId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-confirmations/${confirmationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: 'kelvin',
          decisionReason: 'Approved local ToolCall record only from ChatHub.',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to approve ToolCall record.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve ToolCall record.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleRejectToolRecord = useCallback(async (confirmationId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-confirmations/${confirmationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: 'kelvin',
          decisionReason: 'Rejected local ToolCall record from ChatHub.',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to reject ToolCall record.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject ToolCall record.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleCancelToolCall = useCallback(async (toolCallId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-calls/${toolCallId}/cancel`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to cancel ToolCall.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel ToolCall.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handlePlanToolExecution = useCallback(async (id: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-runs/${id}/plan-execution`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to plan Tool execution.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to plan Tool execution.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleSubmitExecutionConfirmation = useCallback(async (planId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-execution-plans/${planId}/submit-confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewedBy: 'kelvin',
          decisionReason: 'Kelvin approved one local ToolRun execution record only.',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to submit Tool execution confirmation.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit Tool execution confirmation.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleApproveToolExecution = useCallback(async (toolRunId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-runs/${toolRunId}/approve-execution`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to approve ToolRun execution.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve ToolRun execution.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleExecuteApprovedTool = useCallback(async (toolRunId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-runs/${toolRunId}/execute-approved`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to execute approved local ToolRun.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute approved local ToolRun.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleCancelToolExecution = useCallback(async (toolRunId: string) => {
    setError(null)
    setIsUpdatingTool(true)
    try {
      const response = await fetch(`/api/tool-runs/${toolRunId}/cancel-execution`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to cancel Tool execution.')
      await refreshToolCalls()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel Tool execution.')
    } finally {
      setIsUpdatingTool(false)
    }
  }, [refreshToolCalls])

  const handleRunVerification = useCallback(async (targetType: string, targetId: string) => {
    setError(null)
    setIsRunningVerification(true)
    try {
      const targetResponse = await fetch('/api/eval-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          idempotencyKey: `eval-target:${targetType}:${targetId}`,
        }),
      })
      const targetData = await targetResponse.json()
      if (!targetResponse.ok) {
        throw new Error(targetData.error?.message || 'Failed to create EvalTarget.')
      }

      const runResponse = await fetch('/api/eval-runs/from-target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evalTargetId: targetData.data.id,
          idempotencyKey: `eval-run:${targetData.data.id}`,
        }),
      })
      const runData = await runResponse.json()
      if (!runResponse.ok) {
        throw new Error(runData.error?.message || 'Failed to run Verification.')
      }
      setEvalRuns((prev) => {
        const next = prev.filter((bundle) => bundle.evalRun.id !== runData.data.evalRun.id)
        return [runData.data, ...next]
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run Verification.')
    } finally {
      setIsRunningVerification(false)
    }
  }, [])

  const handleCreateCollaborationRecord = useCallback(async (agentRunId: string) => {
    if (!agentRunBundle) return
    setError(null)
    setIsCreatingCollaboration(true)
    try {
      const response = await fetch('/api/collaboration-sessions/from-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: agentRunBundle.agentRun.taskId,
          sourceAgentRunId: agentRunId,
          objective: agentRunBundle.agentRun.result?.summary ?? 'Local multi-Agent collaboration record',
          idempotencyKey: `collaboration-agent-run:${agentRunId}`,
          createdBy: 'agent_record',
          sourceSnapshot: {
            agentRunId,
            agentId: agentRunBundle.agentRun.agentId,
            status: agentRunBundle.agentRun.status,
          },
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create Collaboration record.')
      await refreshSprint5Records(agentRunBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Collaboration record.')
    } finally {
      setIsCreatingCollaboration(false)
    }
  }, [agentRunBundle, refreshSprint5Records])

  const handleCreateCollaborationFromA2A = useCallback(async (a2aMessageId: string) => {
    if (!agentRunBundle) return
    setError(null)
    setIsCreatingCollaboration(true)
    try {
      const response = await fetch('/api/collaboration-sessions/from-a2a-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a2aMessageId,
          idempotencyKey: `collaboration-a2a:${a2aMessageId}`,
          createdBy: 'human',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create Collaboration session.')
      await refreshSprint5Records(agentRunBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create Collaboration session.')
    } finally {
      setIsCreatingCollaboration(false)
    }
  }, [agentRunBundle, refreshSprint5Records])

  const refreshFileChangeProposals = useCallback(async () => {
    if (!agentRunBundle) return
    const response = await fetch(`/api/agent-runtime/runs/${agentRunBundle.agentRun.id}/file-change-proposals`)
    if (response.ok) {
      const data = await response.json()
      setFileChangeProposals(data.data ?? [])
    }
  }, [agentRunBundle])

  const defaultProposalPayload = useCallback(() => ({
    title: 'Local change proposal record',
    summary: 'Sprint 12 local File / Git / PR proposal record. No file, Git, PR, deploy, or ToolRun execution is triggered.',
    rationale: 'Capture reviewable future change intent as metadata-only local record.',
    targetFiles: [
      {
        path: 'metadata-only',
        pathKind: 'metadata_only',
        changeIntent: 'other',
        riskLevel: 'medium',
      },
    ],
    proposedChangeKind: 'other',
    riskLevel: 'medium',
    createdBy: 'human',
  }), [])

  const handleCreateFileProposalFromAgentResult = useCallback(async (agentRunId: string) => {
    setError(null)
    setIsCreatingFileProposal(true)
    try {
      const response = await fetch('/api/file-change-proposals/from-agent-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRunId,
          idempotencyKey: `file-proposal-agent-result:${agentRunId}`,
          ...defaultProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create change proposal.')
      await refreshFileChangeProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create change proposal.')
    } finally {
      setIsCreatingFileProposal(false)
    }
  }, [defaultProposalPayload, refreshFileChangeProposals])

  const handleCreateFileProposalFromToolResult = useCallback(async (toolRunId: string) => {
    setError(null)
    setIsCreatingFileProposal(true)
    try {
      const response = await fetch('/api/file-change-proposals/from-tool-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolRunId,
          idempotencyKey: `file-proposal-tool-result:${toolRunId}`,
          ...defaultProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create change proposal.')
      await refreshFileChangeProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create change proposal.')
    } finally {
      setIsCreatingFileProposal(false)
    }
  }, [defaultProposalPayload, refreshFileChangeProposals])

  const handleCreateFileProposalFromReceipt = useCallback(async (receiptId: string) => {
    setError(null)
    setIsCreatingFileProposal(true)
    try {
      const response = await fetch('/api/file-change-proposals/from-tool-execution-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolExecutionReceiptId: receiptId,
          idempotencyKey: `file-proposal-tool-receipt:${receiptId}`,
          ...defaultProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create change proposal.')
      await refreshFileChangeProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create change proposal.')
    } finally {
      setIsCreatingFileProposal(false)
    }
  }, [defaultProposalPayload, refreshFileChangeProposals])

  const refreshExternalActionProposals = useCallback(async () => {
    if (!agentRunBundle) return
    const response = await fetch(`/api/agent-runtime/runs/${agentRunBundle.agentRun.id}/external-action-proposals`)
    if (response.ok) {
      const data = await response.json()
      setExternalActionProposals(data.data ?? [])
    }
  }, [agentRunBundle])

  const defaultExternalProposalPayload = useCallback(() => ({
    title: 'Local external governance proposal',
    summary: 'Sprint 13 local External / MCP governance proposal. No external API, MCP, webhook, worker, queue, message, Agent, ToolRun, or Task completion is triggered.',
    proposedIntent: 'Capture future external integration governance intent as a local review record.',
    actionCategory: 'other',
    dataClassification: 'unknown',
    riskLevel: 'medium',
    createdBy: 'human',
  }), [])

  const handleCreateExternalProposalFromAgentResult = useCallback(async (agentRunId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch('/api/external-action-proposals/from-agent-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRunId,
          ...defaultExternalProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create external proposal.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create external proposal.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [defaultExternalProposalPayload, refreshExternalActionProposals])

  const handleCreateExternalProposalFromToolResult = useCallback(async (toolRunId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch('/api/external-action-proposals/from-tool-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolRunId,
          ...defaultExternalProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create external proposal.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create external proposal.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [defaultExternalProposalPayload, refreshExternalActionProposals])

  const handleCreateExternalProposalFromReceipt = useCallback(async (receiptId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch('/api/external-action-proposals/from-tool-execution-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolExecutionReceiptId: receiptId,
          ...defaultExternalProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create external proposal.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create external proposal.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [defaultExternalProposalPayload, refreshExternalActionProposals])

  const handleCreateExternalProposalFromFileProposal = useCallback(async (fileChangeProposalId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch('/api/external-action-proposals/from-file-change-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileChangeProposalId,
          ...defaultExternalProposalPayload(),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create external proposal.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create external proposal.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [defaultExternalProposalPayload, refreshExternalActionProposals])

  const handleAssessExternalRisk = useCallback(async (externalActionProposalId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch('/api/integration-risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: 'external_action_proposal',
          targetId: externalActionProposalId,
          riskLevel: 'medium',
          recommendation: 'requires_kelvin_review',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to assess integration risk.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assess integration risk.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [refreshExternalActionProposals])

  const handleApproveExternalRecord = useCallback(async (externalActionProposalId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch(`/api/external-action-proposals/${externalActionProposalId}/approve-record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Approved local external governance record only from ChatHub.',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to approve external record.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve external record.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [refreshExternalActionProposals])

  const handleRejectExternalRecord = useCallback(async (externalActionProposalId: string) => {
    setError(null)
    setIsCreatingExternalProposal(true)
    try {
      const response = await fetch(`/api/external-action-proposals/${externalActionProposalId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Rejected local external governance record from ChatHub.',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to reject external record.')
      await refreshExternalActionProposals()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject external record.')
    } finally {
      setIsCreatingExternalProposal(false)
    }
  }, [refreshExternalActionProposals])

  const refreshWorkflowProposal = useCallback(async (proposalId?: string) => {
    const id = proposalId ?? workflowProposal?.id
    if (!id) return
    const response = await fetch(`/api/workflow-proposals/${id}`)
    if (!response.ok) return
    const data = await response.json()
    const bundle = data.data
    setWorkflowProposal(bundle)
    setWorkflowSteps(bundle.steps ?? [])
    setWorkflowGraph(bundle.graph ?? null)
    setWorkflowReviews(bundle.reviews ?? [])
    setWorkflowAssessments(bundle.assessments ?? [])
  }, [workflowProposal?.id])

  const adoptWorkflowProposal = useCallback(async (proposal: WorkflowProposal) => {
    setWorkflowProposal(proposal)
    await refreshWorkflowProposal(proposal.id)
  }, [refreshWorkflowProposal])

  const createWorkflowProposal = useCallback(async (url: string, body: Record<string, unknown>) => {
    setError(null)
    setIsCreatingWorkflowProposal(true)
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create workflow proposal.')
      await adoptWorkflowProposal(data.data as WorkflowProposal)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow proposal.')
    } finally {
      setIsCreatingWorkflowProposal(false)
    }
  }, [adoptWorkflowProposal])

  const handleCreateWorkflowFromAgentRun = useCallback((agentRunId: string) => createWorkflowProposal('/api/workflow-proposals/from-agent-run', {
    agentRunId,
    idempotencyKey: `workflow-agent-run:${agentRunId}`,
    createdBy: 'user',
  }), [createWorkflowProposal])

  const handleCreateWorkflowFromToolRun = useCallback((toolRunId: string) => createWorkflowProposal('/api/workflow-proposals/from-tool-run', {
    toolRunId,
    idempotencyKey: `workflow-tool-run:${toolRunId}`,
    createdBy: 'user',
  }), [createWorkflowProposal])

  const handleCreateWorkflowFromReceipt = useCallback((toolExecutionReceiptId: string) => createWorkflowProposal('/api/workflow-proposals/from-tool-execution-receipt', {
    toolExecutionReceiptId,
    idempotencyKey: `workflow-tool-receipt:${toolExecutionReceiptId}`,
    createdBy: 'user',
  }), [createWorkflowProposal])

  const handleCreateWorkflowFromFileProposal = useCallback((fileChangeProposalId: string) => createWorkflowProposal('/api/workflow-proposals/from-file-change-proposal', {
    fileChangeProposalId,
    idempotencyKey: `workflow-file-proposal:${fileChangeProposalId}`,
    createdBy: 'user',
  }), [createWorkflowProposal])

  const handleCreateWorkflowFromExternalProposal = useCallback((externalActionProposalId: string) => createWorkflowProposal('/api/workflow-proposals/from-external-action-proposal', {
    externalActionProposalId,
    idempotencyKey: `workflow-external-proposal:${externalActionProposalId}`,
    createdBy: 'user',
  }), [createWorkflowProposal])

  const handleCreateWorkflowStep = useCallback(async (proposalId: string) => {
    setError(null)
    setIsCreatingWorkflowProposal(true)
    try {
      const response = await fetch(`/api/workflow-proposals/${proposalId}/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepIndex: workflowSteps.length + 1,
          title: 'Review local workflow evidence',
          summary: 'Local workflow step record only. It cannot execute the referenced record.',
          stepKind: 'review_record',
          referencedRecordType: workflowProposal?.sourceKind ?? 'sanitized_context_snapshot',
          referencedRecordId: workflowProposal?.sourceRecordId,
          createdBy: 'user',
          forbiddenExecutionReason: 'Sprint 14 step records do not execute workflow, Agent, ToolRun, file, Git, external, MCP, PR, deploy, Task, retry, replay, rollback, or resume behavior.',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create workflow step.')
      await refreshWorkflowProposal(proposalId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow step.')
    } finally {
      setIsCreatingWorkflowProposal(false)
    }
  }, [refreshWorkflowProposal, workflowProposal, workflowSteps.length])

  const handleAssessWorkflowReadiness = useCallback(async (proposalId: string) => {
    setError(null)
    setIsCreatingWorkflowProposal(true)
    try {
      const response = await fetch(`/api/workflow-proposals/${proposalId}/readiness-assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation: 'needs_review',
          riskFindings: [],
          missingEvidence: [],
          blockedReasons: [],
          createdBy: 'user',
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to assess workflow readiness.')
      await refreshWorkflowProposal(proposalId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assess workflow readiness.')
    } finally {
      setIsCreatingWorkflowProposal(false)
    }
  }, [refreshWorkflowProposal])

  const updateWorkflowProposalStatus = useCallback(async (proposalId: string, action: string, reason: string) => {
    setError(null)
    setIsCreatingWorkflowProposal(true)
    try {
      const response = await fetch(`/api/workflow-proposals/${proposalId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to update workflow proposal.')
      await refreshWorkflowProposal(proposalId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workflow proposal.')
    } finally {
      setIsCreatingWorkflowProposal(false)
    }
  }, [refreshWorkflowProposal])

  const handleSubmitWorkflowReview = useCallback((proposalId: string) => updateWorkflowProposalStatus(proposalId, 'submit-review', 'Submitted local workflow record for review.'), [updateWorkflowProposalStatus])
  const handleDraftWorkflowRecord = useCallback((proposalId: string) => updateWorkflowProposalStatus(proposalId, 'draft', 'Moved local workflow record to draft.'), [updateWorkflowProposalStatus])
  const handleApproveWorkflowRecord = useCallback((proposalId: string) => updateWorkflowProposalStatus(proposalId, 'approve-record', 'Approved local workflow record only.'), [updateWorkflowProposalStatus])
  const handleRejectWorkflowRecord = useCallback((proposalId: string) => updateWorkflowProposalStatus(proposalId, 'reject', 'Rejected local workflow record.'), [updateWorkflowProposalStatus])
  const handleArchiveWorkflowRecord = useCallback((proposalId: string) => updateWorkflowProposalStatus(proposalId, 'archive', 'Archived local workflow record.'), [updateWorkflowProposalStatus])

  const refreshMVPClosureRecords = useCallback(async (readinessRecordId?: string) => {
    const [readinessResponse, demoResponse, governanceResponse, reviewResponse] = await Promise.all([
      readinessRecordId
        ? fetch(`/api/mvp-readiness-records/${readinessRecordId}`)
        : fetch('/api/mvp-readiness-records'),
      fetch('/api/demo-scenario-records'),
      fetch('/api/governance-summary-records'),
      fetch('/api/mvp-review-records'),
    ])

    if (readinessResponse.ok) {
      const readiness = await readinessResponse.json()
      const record = readinessRecordId ? readiness.data : readiness.data?.[0]
      setMVPReadinessRecord(record ?? null)
      if (readinessRecordId && readiness.data?.reviews) {
        setMVPReviewRecords(readiness.data.reviews)
      }
    }
    if (demoResponse.ok) {
      const demo = await demoResponse.json()
      setDemoScenarioRecords(demo.data ?? [])
    }
    if (governanceResponse.ok) {
      const governance = await governanceResponse.json()
      setGovernanceSummaryRecords(governance.data ?? [])
    }
    if (reviewResponse.ok && !readinessRecordId) {
      const reviews = await reviewResponse.json()
      setMVPReviewRecords(reviews.data ?? [])
    }
  }, [])

  const handleCreateMVPReadinessRecord = useCallback(async () => {
    if (!workflowProposal) return
    setError(null)
    setIsCreatingMVPClosure(true)
    try {
      const response = await fetch('/api/mvp-readiness-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'MVP Closure Readiness',
          summary: 'Local Sprint 15 MVP readiness record built from Sprint 1-14 evidence. Approval is not execution, release, deploy, publish, or task completion.',
          targetVersion: 'mvp-local',
          readinessScope: 'stage_closure',
          evidenceRefs: [{
            sourceType: 'workflow_proposal',
            sourceId: workflowProposal.id,
            summary: `WorkflowProposal ${workflowProposal.title} (${workflowProposal.status})`,
            redactionStatus: 'sanitized',
            isExecutionToken: false,
            isReleaseToken: false,
            isDeployToken: false,
          }],
          recommendation: 'needs_review',
          createdBy: 'user',
          correlationId: workflowProposal.correlationId,
          idempotencyKey: `mvp-readiness:${workflowProposal.id}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create MVP readiness record.')
      setMVPReadinessRecord(data.data as MVPReadinessRecord)
      await refreshMVPClosureRecords((data.data as MVPReadinessRecord).id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create MVP readiness record.')
    } finally {
      setIsCreatingMVPClosure(false)
    }
  }, [refreshMVPClosureRecords, workflowProposal])

  const handleCreateDemoScenarioRecord = useCallback(async () => {
    setError(null)
    setIsCreatingMVPClosure(true)
    try {
      const response = await fetch('/api/demo-scenario-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'MVP Demo Scenario',
          summary: 'Local demo scenario record for reviewing Sprint 1-14 MVP evidence.',
          scenarioKind: 'demo_script',
          entryPoint: 'chathub',
          orderedEvidenceRefs: workflowProposal ? [{
            sourceType: 'workflow_proposal',
            sourceId: workflowProposal.id,
            displayLabel: 'Workflow Proposal',
            summary: `WorkflowProposal ${workflowProposal.title}`,
            redactionStatus: 'sanitized',
            isExecutionToken: false,
          }] : [],
          expectedScreens: ['ChatHub', 'Task UI', 'Governance Console'],
          expectedLocalRecords: ['MVPReadinessRecord', 'GovernanceSummaryRecord', 'MVPReviewRecord'],
          forbiddenRuntimeActions: [],
          demoScriptMarkdown: 'View local Sprint 15 MVP readiness, demo, governance summary, audit, and timeline records.',
          seedDataRefs: [],
          createdBy: 'user',
          correlationId: workflowProposal?.correlationId,
          idempotencyKey: `mvp-demo:${workflowProposal?.id ?? 'manual'}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create demo scenario record.')
      await refreshMVPClosureRecords(mvpReadinessRecord?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create demo scenario record.')
    } finally {
      setIsCreatingMVPClosure(false)
    }
  }, [mvpReadinessRecord, refreshMVPClosureRecords, workflowProposal])

  const handleCreateGovernanceSummaryRecord = useCallback(async () => {
    setError(null)
    setIsCreatingMVPClosure(true)
    try {
      const response = await fetch('/api/governance-summary-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'MVP Governance Summary',
          summary: 'Local governance summary for Sprint 1-14 MVP closure.',
          recordCountsByType: {
            workflowProposal: workflowProposal ? 1 : 0,
            demoScenario: demoScenarioRecords.length,
            mvpReview: mvpReviewRecords.length,
          },
          safetyBoundarySummary: 'Sprint 15 adds local readiness records only.',
          defaultDenySummary: 'Execution, release, deploy, publish, and task completion remain denied.',
          humanConfirmationSummary: 'Kelvin approval only changes one local record status.',
          auditCoverageSummary: 'Sprint 15 lifecycle events are recorded as local audit evidence.',
          observabilityCoverageSummary: 'Observability remains view-only evidence.',
          recoveryCoverageSummary: 'RecoveryPoint links are evidence only; no rollback or restore.',
          evalCoverageSummary: 'Eval, RegressionGate, and ReleaseReadiness are recommendation-only evidence.',
          regressionEvidenceRefs: [],
          releaseReadinessRefs: [],
          knownLimitations: ['Sprint 15 does not release, deploy, publish, or execute anything.'],
          riskFindings: [],
          createdBy: 'user',
          correlationId: workflowProposal?.correlationId,
          idempotencyKey: `mvp-governance:${workflowProposal?.id ?? 'manual'}`,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to create governance summary record.')
      await refreshMVPClosureRecords(mvpReadinessRecord?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create governance summary record.')
    } finally {
      setIsCreatingMVPClosure(false)
    }
  }, [demoScenarioRecords, mvpReadinessRecord, mvpReviewRecords, refreshMVPClosureRecords, workflowProposal])

  const updateMVPReadinessStatus = useCallback(async (recordId: string, action: string, reason: string) => {
    setError(null)
    setIsCreatingMVPClosure(true)
    try {
      const response = await fetch(`/api/mvp-readiness-records/${recordId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error?.message || 'Failed to update MVP readiness record.')
      await refreshMVPClosureRecords(recordId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update MVP readiness record.')
    } finally {
      setIsCreatingMVPClosure(false)
    }
  }, [refreshMVPClosureRecords])

  const handleSubmitMVPReview = useCallback((recordId: string) => updateMVPReadinessStatus(recordId, 'submit-review', 'Submitted local MVP readiness record for review.'), [updateMVPReadinessStatus])
  const handleApproveMVPRecord = useCallback((recordId: string) => updateMVPReadinessStatus(recordId, 'approve-record', 'Approved local MVP readiness record only.'), [updateMVPReadinessStatus])
  const handleRejectMVPRecord = useCallback((recordId: string) => updateMVPReadinessStatus(recordId, 'reject', 'Rejected local MVP readiness record.'), [updateMVPReadinessStatus])
  const handleArchiveMVPRecord = useCallback((recordId: string) => updateMVPReadinessStatus(recordId, 'archive', 'Archived local MVP readiness record.'), [updateMVPReadinessStatus])

  const handleApproveConfirmation = useCallback(async (confirmationId: string) => {
    setError(null)
    setIsUpdatingTask(true)

    try {
      const response = await fetch(`/api/harmony/confirmations/${confirmationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedBy: 'kelvin',
          decisionReason: 'Approved queueing only from ChatHub.',
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to approve confirmation.')

      setHarmonyTaskBundle(data as HarmonyTaskBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve confirmation.')
    } finally {
      setIsUpdatingTask(false)
    }
  }, [])

  const handleRejectConfirmation = useCallback(async (confirmationId: string) => {
    setError(null)
    setIsUpdatingTask(true)

    try {
      const response = await fetch(`/api/harmony/confirmations/${confirmationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: 'kelvin',
          decisionReason: 'Rejected from ChatHub.',
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to reject confirmation.')

      setHarmonyTaskBundle(data as HarmonyTaskBundle)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject confirmation.')
    } finally {
      setIsUpdatingTask(false)
    }
  }, [])

  const handleNewConversation = () => {
    setMessages([])
    setConversationId(null)
    setError(null)
    setRouteDecision(null)
    setHarmonyTaskBundle(null)
    setAgentRunBundle(null)
    setContextPackets([])
    setMemoryEntries([])
    setA2AMessages([])
    setToolCalls([])
    setEvalRuns([])
    setCollaborationSessions([])
    setFileChangeProposals([])
    setExternalActionProposals([])
    setWorkflowProposal(null)
    setWorkflowSteps([])
    setWorkflowGraph(null)
    setWorkflowReviews([])
    setWorkflowAssessments([])
    setMVPReadinessRecord(null)
    setDemoScenarioRecords([])
    setGovernanceSummaryRecords([])
    setMVPReviewRecords([])
    setLastUserMessageText('')
  }

  return (
    <div className="flex h-screen bg-white text-gray-950">
      <aside className="hidden w-72 shrink-0 border-r bg-gray-50 md:flex md:flex-col">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">对话</h2>
          <button
            onClick={handleNewConversation}
            className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-gray-700"
          >
            新建
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-sm text-gray-500">暂无历史对话</p>
          ) : (
            conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => loadMessages(conversation.id).catch((err) => {
                  setError(err instanceof Error ? err.message : '加载对话失败')
                })}
                className={`mb-1 w-full truncate rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  conversation.id === conversationId
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-200'
                }`}
              >
                {conversation.title}
              </button>
            ))
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 顶部导航栏 */}
        <header className="border-b bg-white px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900">
                CoWorker+A2A ChatHub
              </h1>
              <p className="mt-1 max-w-3xl text-xs leading-5 text-gray-500">
                v1 local governance workspace. ChatHub creates and displays local records; Operator Console reviews evidence, departments, execution gates and assignment records without hidden runtime authorization.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href="/operator"
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white transition-colors hover:bg-slate-700"
              >
                Operator Console
              </a>
              <button
                onClick={handleNewConversation}
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-300 md:hidden"
              >
                新建对话
              </button>
            </div>
          </div>
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              关闭
            </button>
          </div>
        )}

        <RouteDecisionCard
          decision={routeDecision}
          isCreatingTask={isCreatingTask}
          onCreateHarmonyTask={handleCreateHarmonyTask}
        />
        <MultiAgentCard
          reasoning={multiAgentReasoning}
          subtasks={multiAgentSubtasks}
          agentResults={multiAgentResults}
          isExecuting={isMultiAgentExecuting}
          isSummarizing={isMultiAgentSummarizing}
        />
        {/* Sprint 16: 渲染交付物 */}
        {deliverables.map((d, i) => (
          <DeliverableCard
            key={i}
            deliverables={d.deliverables}
            agentName={d.agentName}
            summary={d.summary}
            confidence={d.confidence}
          />
        ))}
        {/* Sprint 20: 渲染审查结果 */}
        {agentReviews.map((review, i) => (
          <ReviewCard key={i} review={review} />
        ))}
        <ProductionSecurityCard />
        <HarmonyTaskCard
          bundle={harmonyTaskBundle}
          contextPackets={contextPackets}
          memoryEntries={memoryEntries}
          a2aMessages={a2aMessages}
          toolCalls={toolCalls}
          collaborationSessions={collaborationSessions}
          isUpdating={isUpdatingTask}
          isRunningAgent={isRunningAgent}
          isRunningVerification={isRunningVerification}
          onApprove={handleApproveConfirmation}
          onReject={handleRejectConfirmation}
          onRunAgentAnalysis={handleRunAgentAnalysis}
          onRunVerification={handleRunVerification}
        />
        <CollaborationSessionCard
          sessions={collaborationSessions}
          a2aMessages={a2aMessages}
          isCreating={isCreatingCollaboration}
          onCreateFromA2AMessage={handleCreateCollaborationFromA2A}
        />
        <AgentResultCard
          bundle={agentRunBundle}
          isBuildingContext={isBuildingContext}
          isCreatingMemory={isCreatingMemory}
          isDraftingA2A={isDraftingA2A}
          isProposingTool={isProposingTool}
          isRunningVerification={isRunningVerification}
          isCreatingCollaboration={isCreatingCollaboration}
          onBuildContextPacket={handleBuildContextPacket}
          onCreateMemoryCandidate={handleCreateMemoryCandidate}
          onDraftA2AMessage={handleDraftA2AMessage}
          onProposeToolCall={handleProposeToolCall}
          onRunVerification={handleRunVerification}
          onCreateCollaborationRecord={handleCreateCollaborationRecord}
        />
        <ToolCallCard
          bundles={toolCalls}
          isUpdating={isUpdatingTool}
          isRunningVerification={isRunningVerification}
          onEvaluatePermission={handleEvaluateToolPermission}
          onApproveRecord={handleApproveToolRecord}
          onReject={handleRejectToolRecord}
          onCancel={handleCancelToolCall}
          onRunVerification={handleRunVerification}
          onPlanExecution={handlePlanToolExecution}
          onSubmitExecutionConfirmation={handleSubmitExecutionConfirmation}
          onApproveExecution={handleApproveToolExecution}
          onExecuteApproved={handleExecuteApprovedTool}
          onCancelExecution={handleCancelToolExecution}
        />
        <FileGitPrCard
          proposals={fileChangeProposals}
          agentRunId={agentRunBundle?.agentRun.id}
          toolCalls={toolCalls}
          isCreating={isCreatingFileProposal}
          onCreateFromAgentResult={handleCreateFileProposalFromAgentResult}
          onCreateFromToolResult={handleCreateFileProposalFromToolResult}
          onCreateFromToolExecutionReceipt={handleCreateFileProposalFromReceipt}
        />
        <ExternalMcpGovernanceCard
          proposals={externalActionProposals}
          agentRunId={agentRunBundle?.agentRun.id}
          toolCalls={toolCalls}
          fileChangeProposals={fileChangeProposals}
          isCreating={isCreatingExternalProposal}
          onCreateFromAgentResult={handleCreateExternalProposalFromAgentResult}
          onCreateFromToolResult={handleCreateExternalProposalFromToolResult}
          onCreateFromToolExecutionReceipt={handleCreateExternalProposalFromReceipt}
          onCreateFromFileChangeProposal={handleCreateExternalProposalFromFileProposal}
          onAssessRisk={handleAssessExternalRisk}
          onApproveRecord={handleApproveExternalRecord}
          onRejectRecord={handleRejectExternalRecord}
        />
        <WorkflowProposalCard
          proposal={workflowProposal}
          steps={workflowSteps}
          graph={workflowGraph}
          reviews={workflowReviews}
          assessments={workflowAssessments}
          agentRunId={agentRunBundle?.agentRun.id}
          toolCalls={toolCalls}
          fileChangeProposals={fileChangeProposals}
          externalActionProposals={externalActionProposals}
          isCreating={isCreatingWorkflowProposal}
          onCreateFromAgentRun={handleCreateWorkflowFromAgentRun}
          onCreateFromToolRun={handleCreateWorkflowFromToolRun}
          onCreateFromToolExecutionReceipt={handleCreateWorkflowFromReceipt}
          onCreateFromFileChangeProposal={handleCreateWorkflowFromFileProposal}
          onCreateFromExternalActionProposal={handleCreateWorkflowFromExternalProposal}
          onCreateStep={handleCreateWorkflowStep}
          onMoveToDraft={handleDraftWorkflowRecord}
          onAssessReadiness={handleAssessWorkflowReadiness}
          onSubmitReview={handleSubmitWorkflowReview}
          onApproveRecord={handleApproveWorkflowRecord}
          onReject={handleRejectWorkflowRecord}
          onArchive={handleArchiveWorkflowRecord}
        />
        <MVPClosureCard
          readinessRecord={mvpReadinessRecord}
          demoScenarios={demoScenarioRecords}
          governanceSummaries={governanceSummaryRecords}
          reviews={mvpReviewRecords}
          workflowProposal={workflowProposal}
          isCreating={isCreatingMVPClosure}
          onCreateReadiness={handleCreateMVPReadinessRecord}
          onCreateDemoScenario={handleCreateDemoScenarioRecord}
          onCreateGovernanceSummary={handleCreateGovernanceSummaryRecord}
          onSubmitReview={handleSubmitMVPReview}
          onApproveRecord={handleApproveMVPRecord}
          onRejectRecord={handleRejectMVPRecord}
          onArchiveRecord={handleArchiveMVPRecord}
        />
        <EvalResultCard bundles={evalRuns} />

        {/* 消息列表 */}
        <MessageList messages={messages} isLoading={isLoading || isBooting} />

        {/* 输入框 */}
        <ChatInput onSend={handleSend} disabled={isLoading || isBooting} />
      </div>
    </div>
  )
}
