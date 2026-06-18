# Contract: CollaborationSession

Status: proposed for Sprint 9

## Purpose

CollaborationSession is the root local record for a controlled multi-Agent collaboration.

It groups A2A threads, turns, handoffs, decisions, audit, eval, and observability records.

## Schema

```ts
CollaborationSession {
  id: string
  idempotencyKey?: string
  correlationId: string

  taskId?: string
  sourceA2AMessageId?: string
  sourceAgentRunId?: string
  sourceEvalRunId?: string
  teamId?: string

  status:
    | 'draft'
    | 'queued_for_review'
    | 'active'
    | 'paused'
    | 'waiting_human'
    | 'completed_record'
    | 'blocked'
    | 'rejected'
    | 'cancelled'
    | 'superseded'
    | 'archived'

  objective: string
  summary?: string
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean

  participants: {
    agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
    role:
      | 'lead'
      | 'product'
      | 'engineering'
      | 'verification'
      | 'customer'
      | 'human_owner'
      | 'observer'
    responsibility: string
  }[]

  plan: {
    plannedByAgentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
    planSource: 'ceo_record' | 'human' | 'system' | 'agent_result_record'
    sourceSnapshot?: Json
    steps: {
      index: number
      title: string
      ownerAgentId: string
      expectedOutput: string
      requiresHumanConfirmation: boolean
    }[]
    constraints: string[]
    forbiddenActions: string[]
  }

  confirmationArtifactId?: string
  supersedesCollaborationSessionId?: string
  supersededByCollaborationSessionId?: string

  createdBy: 'human' | 'system' | 'agent_record'
  createdAt: string
  updatedAt: string
}
```

## Creation Rules

Allowed sources:

- explicit user action from Harmony Task.
- explicit user action from A2AMessage `approved_record`.
- explicit user action from AgentResult card.
- explicit API call with idempotencyKey.

Disallowed:

- automatic creation when A2AMessage becomes `approved_record`.
- automatic creation when AgentRun completes.
- automatic creation when EvalRun completes.

## Safety Invariants

- CollaborationSession creation must not start AgentRun.
- `active` means local record flow is open, not that Agents are running.
- `completed_record` means local collaboration record is complete, not that the Task is complete.
- CollaborationSession must not execute tools, call external APIs, send messages, or mutate files.
- CollaborationSession plan source snapshots must be sanitized and must not include secrets, full file contents, full command output, or raw external payloads.

## Sprint 10 Production Hardening Boundary

Sprint 10 may inspect CollaborationSession records through AgentProfile, AgentPermissionBoundary, ReleaseReadinessChecklist, and RegressionGate.

Allowed:

- verify participants have AgentProfile records.
- verify plan owner actions respect AgentPermissionBoundary.
- verify plan source snapshots are sanitized.
- verify local collaboration remains non-dispatching and non-autonomous.

Disallowed:

- Sprint 10 must not open, continue, complete, or dispatch CollaborationSession automatically.
- Sprint 10 must not create A2ATurn from release readiness or regression checks.
- Sprint 10 must not start AgentRun from CollaborationSession.
- Sprint 10 must not execute ToolCall or ToolRun from CollaborationDecision.
- Sprint 10 must not mutate Task status from CollaborationSession status.
