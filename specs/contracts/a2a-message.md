# Contract: A2AMessage

Status: proposed for Sprint 5

## Purpose

A2AMessage represents a local Agent-to-Agent message draft or local collaboration record.

In Sprint 5, A2AMessage is not real cross-process communication. It must not send messages, start target Agents, call external APIs, enqueue workers, or enter autonomous loops.

## Schema

```ts
A2AMessage {
  id: string
  status:
    | 'draft'
    | 'queued_for_review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  taskId?: string
  agentRunId?: string

  fromAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  toAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'

  intent:
    | 'handoff'
    | 'request_review'
    | 'request_clarification'
    | 'share_finding'
    | 'propose_next_step'
    | 'escalate_to_kelvin'

  subject: string
  body: string

  payload?: {
    routeDecisionId?: string
    taskStepId?: string
    agentResultId?: string
    memoryEntryIds?: string[]
    knowledgeItemIds?: string[]
  }

  requiresHumanConfirmation: boolean
  reviewedBy?: string
  reviewedAt?: string
  rejectionReason?: string

  createdBy: 'agent' | 'human' | 'system'
  createdAt: string
  updatedAt: string
}
```

## Status Rules

Allowed transitions:

```text
draft -> queued_for_review
draft -> archived
queued_for_review -> approved_record
queued_for_review -> rejected
approved_record -> superseded
approved_record -> archived
rejected -> archived
superseded -> archived
```

## Sprint 5 A2A Boundary

`approved_record` means:

- this local message record has been reviewed
- it may be shown in UI
- it may be referenced by future specs or future runtimes

`approved_record` does not mean:

- message was sent
- target Agent started
- an external API was called
- a queue job was created
- an autonomous loop began
- a Task was completed

## Human Review Boundary

Kelvin / Human Owner review is required when:

- message requests high-risk action
- message mentions deploy, delete, production, secrets, permissions, database migration, external communication, or customer-sensitive content
- message proposes future Tool Runtime execution
- message escalates to Kelvin

## Audit Events

Required events:

- `a2a.draft_created`
- `a2a.submitted_for_review`
- `a2a.approved_record`
- `a2a.rejected`
- `a2a.superseded`
- `a2a.archived`

## Safety Invariants

- A2AMessage is local only in Sprint 5.
- No API may send A2AMessage outside the app.
- No API may start target Agent from A2AMessage approval.
- No API may call external APIs, queues, webhooks, Tool Runtime, shell, Git, file writes, PRs, deploys, or deletes.

## Sprint 9 Collaboration Boundary

Sprint 9 may reference A2AMessage records when creating local CollaborationSession records.

Allowed:

- A2AMessage `approved_record` may be selected by an explicit user action.
- The selected A2AMessage may be copied into CollaborationSession source metadata.
- A2AMessage may be linked to A2AThread, A2ATurn, HandoffRequest, or CollaborationDecision records for audit.

Disallowed:

- A2AMessage `approved_record` must not automatically create CollaborationSession.
- A2AMessage approval must not activate CollaborationSession.
- A2AMessage approval must not create A2ATurn automatically.
- A2AMessage approval must not send, dispatch, queue, or deliver a message.
- A2AMessage approval must not start target Agent.
- A2AMessage approval must not execute tools, call external APIs, use MCP, run shell or Git, modify files, create PRs, deploy, delete, or complete Task.
