export type AgentId = 'kelvin' | 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos'

export type AgentRole =
  | 'human'
  | 'ceo'
  | 'product'
  | 'engineering'
  | 'verification'
  | 'customer'

export type RouteDecisionType =
  | 'chat_only'
  | 'create_task'
  | 'delegate_to_agent'
  | 'needs_human_confirmation'
  | 'unsupported'

export type RouteNextAction =
  | 'continue_chat'
  | 'show_route_suggestion'
  | 'ask_human_confirmation'
  | 'show_unsupported'

export type RouteStatus = 'ready' | 'blocked' | 'unsupported'

export interface RouteSideEffects {
  filesChanged: string[]
  branchesCreated: string[]
  prsCreated: string[]
  issuesUpdated: string[]
}

export interface AgentProfile {
  id: AgentId
  name: string
  title: string
  role: AgentRole
  description: string
  responsibilities: string[]
  capabilities: string[]
  skillRefs: string[]
  /** 关联的 Skill Prompt 名称列表（来自 auto-dev-framework） */
  skillPromptNames?: string[]
  defaultDecisionTypes: RouteDecisionType[]
  isHuman: boolean
  isEnabled: boolean
}

export interface RouteDecision {
  status: RouteStatus
  decisionType: RouteDecisionType
  targetAgentId?: AgentId
  confidence: number
  reason: string
  matchedSignals: string[]
  suggestedTaskTitle?: string
  requiresHumanConfirmation: boolean
  next: {
    recommendedAction: RouteNextAction
    reason: string
  }
  sideEffects: RouteSideEffects
}

export interface RouteMessageInput {
  message: string
  conversationId?: string
}

// ─── Sprint 16: Agent 产出协议 ────────────────────────────

export type DeliverableType = 'document' | 'code' | 'analysis' | 'report' | 'plan'
export type DeliverableFormat = 'markdown' | 'json' | 'code'

export interface Deliverable {
  type: DeliverableType
  title: string
  content: string
  format: DeliverableFormat
  metadata?: Record<string, unknown>
}

export interface AgentOutput {
  agentId: string
  agentName: string
  taskTitle: string
  deliverables: Deliverable[]
  summary: string
  nextAction?: { recommendedAction: string; reason: string }
  confidence: number
  durationMs: number
}

// ─── Sprint 20: Agent 审查协议 ────────────────────────────

export type AgentResultNextAction =
  | 'stop'
  | 'show_result'
  | 'ask_human_confirmation'
  | 'request_more_context'

export type ReviewVerdict = 'approve' | 'request_changes' | 'reject'

export interface AgentReview {
  agentId: string
  targetAgentId: string
  targetDeliverableTitle: string
  verdict: ReviewVerdict
  confidence: number
  findings: string[]
  suggestions: string[]
  summary: string
}
