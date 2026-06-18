import type { AgentId } from '@/lib/agents/types'
import type { A2AMessage } from '@/lib/memory/types'
import type {
  CollaborationParticipant,
  CollaborationPlan,
  CollaborationSession,
  RiskLevel,
} from './types'

const secretKeyPattern = /secret|token|password|apiKey|authorization|cookie|env/i
const blockedKeyPattern = /rawPayload|fullFileContent|fullCommandOutput|externalPayload/i

export function sanitizeCollaborationSnapshot(value: unknown): unknown {
  const blocked = findBlockedPath(value)
  if (blocked) throw new Error(`CollaborationSession plan source snapshot contains blocked field ${blocked}.`)
  return sanitizeValue(value)
}

export function buildDefaultParticipants(): CollaborationParticipant[] {
  return [
    { agentId: 'elon', role: 'lead', responsibility: 'Create local collaboration plan records and coordinate responsibilities without starting Agents.' },
    { agentId: 'jobs', role: 'product', responsibility: 'Contribute product scope, user value, and prioritization records.' },
    { agentId: 'linus', role: 'engineering', responsibility: 'Contribute implementation analysis, dependency, and risk records.' },
    { agentId: 'turing', role: 'verification', responsibility: 'Contribute critique, verification, and recommendation-only quality checks.' },
    { agentId: 'bezos', role: 'customer', responsibility: 'Contribute customer impact and feedback framing records.' },
  ]
}

export function buildCeoCollaborationPlan(input: {
  objective: string
  sourceSnapshot?: unknown
  plannedByAgentId?: AgentId
}): CollaborationPlan {
  return {
    plannedByAgentId: input.plannedByAgentId ?? 'elon',
    planSource: input.plannedByAgentId ? 'agent_result_record' : 'ceo_record',
    sourceSnapshot: sanitizeCollaborationSnapshot(input.sourceSnapshot ?? { objective: input.objective }),
    steps: [
      {
        index: 1,
        title: 'Product framing record',
        ownerAgentId: 'jobs',
        expectedOutput: 'Local product scope and user-value notes.',
        requiresHumanConfirmation: false,
      },
      {
        index: 2,
        title: 'Engineering assessment record',
        ownerAgentId: 'linus',
        expectedOutput: 'Local implementation approach, dependency, and risk notes.',
        requiresHumanConfirmation: false,
      },
      {
        index: 3,
        title: 'Verification review record',
        ownerAgentId: 'turing',
        expectedOutput: 'Local verification checklist and quality gate recommendation.',
        requiresHumanConfirmation: false,
      },
    ],
    constraints: [
      'local records only',
      'no autonomous loop',
      'no Tool Runtime',
      'no external API',
      'no file mutation',
    ],
    forbiddenActions: [
      'send-a2a-message',
      'dispatch-a2a',
      'start-agent',
      'execute-tool',
      'run-shell-command',
      'write-file',
      'create-pr',
      'deploy',
      'complete-task',
    ],
  }
}

export function mapA2AMessageToSessionDraft(message: A2AMessage): {
  objective: string
  summary: string
  riskLevel: RiskLevel
  participants: CollaborationParticipant[]
  plan: CollaborationPlan
} {
  if (message.status !== 'approved_record') {
    throw new Error('Only A2AMessage approved_record can be used to create CollaborationSession.')
  }
  return {
    objective: message.subject,
    summary: message.body,
    riskLevel: message.requiresHumanConfirmation ? 'high' : 'medium',
    participants: buildDefaultParticipants(),
    plan: buildCeoCollaborationPlan({
      objective: message.subject,
      sourceSnapshot: {
        a2aMessageId: message.id,
        taskId: message.taskId,
        agentRunId: message.agentRunId,
        fromAgentId: message.fromAgentId,
        toAgentId: message.toAgentId,
        intent: message.intent,
        subject: message.subject,
      },
    }),
  }
}

export function nextTurnSeq(existing: Array<{ seq: number }>): number {
  return existing.reduce((max, turn) => Math.max(max, turn.seq), 0) + 1
}

export function requiresKelvinReview(riskLevel: RiskLevel, text = ''): boolean {
  return riskLevel === 'high' ||
    riskLevel === 'critical' ||
    /deploy|delete|production|credential|secret|permission|external|customer-sensitive|tool|file|pr/i.test(text)
}

export function assertLocalRecordOnly(action: string): void {
  if (/send|dispatch|execute|run tool|start agent|auto continue|loop|enqueue|deliver|external|complete task/i.test(action)) {
    throw new Error('Sprint 9 collaboration is local-record only and cannot trigger execution semantics.')
  }
}

function findBlockedPath(value: unknown, path = '$'): string | undefined {
  if (!value || typeof value !== 'object') return undefined
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findBlockedPath(value[index], `${path}[${index}]`)
      if (found) return found
    }
    return undefined
  }
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`
    if (blockedKeyPattern.test(key)) return childPath
    const found = findBlockedPath(child, childPath)
    if (found) return found
  }
  return undefined
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (!value || typeof value !== 'object') {
    return typeof value === 'string' && value.length > 1000 ? `${value.slice(0, 1000)}...` : value
  }
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    out[key] = secretKeyPattern.test(key) ? '[REDACTED]' : sanitizeValue(child)
  }
  return out
}

export function buildSessionBundleSummary(session: CollaborationSession) {
  return {
    collaborationSessionId: session.id,
    status: session.status,
    objective: session.objective,
    riskLevel: session.riskLevel,
    localRecordOnly: true,
  }
}

