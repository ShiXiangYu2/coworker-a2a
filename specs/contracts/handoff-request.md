# Contract: HandoffRequest

Status: proposed for Sprint 9

## Purpose

HandoffRequest records a local request for one Agent role to hand off work, context, review, or decision input to another Agent role.

It does not deliver the handoff to a live Agent.

## Schema

```ts
HandoffRequest {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  threadId?: string
  taskId?: string
  sourceA2AMessageId?: string
  sourceTurnId?: string

  fromAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  toAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'

  status:
    | 'draft'
    | 'queued_for_review'
    | 'approved_record'
    | 'rejected'
    | 'cancelled'
    | 'superseded'
    | 'archived'

  handoffType:
    | 'product_to_engineering'
    | 'engineering_to_verification'
    | 'verification_to_product'
    | 'customer_to_product'
    | 'ceo_to_specialist'
    | 'specialist_to_ceo'
    | 'escalate_to_kelvin'

  reason: string
  requestedScope: string
  expectedOutput: string
  contextRefs: {
    contextPacketIds?: string[]
    memoryEntryIds?: string[]
    knowledgeItemIds?: string[]
    agentRunIds?: string[]
    evalRunIds?: string[]
    toolCallIds?: string[]
  }

  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  createdBy: 'human' | 'system' | 'agent_record'
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}
```

## Safety Invariants

- HandoffRequest approval means approved local handoff record only.
- HandoffRequest approval must not start `toAgentId`.
- HandoffRequest approval must not enqueue, dispatch, send, or call external APIs.
- High-risk handoffs require Kelvin confirmation.

