# Contract: A2ATurn

Status: proposed for Sprint 9

## Purpose

A2ATurn is one ordered local collaboration contribution inside an A2AThread.

It may represent a local handoff note, review comment, clarification, critique, or decision input.

## Schema

```ts
A2ATurn {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  threadId: string
  taskId?: string
  sourceA2AMessageId?: string
  sourceAgentRunId?: string

  seq: number
  speakerAgentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  audienceAgentIds: ('elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin')[]

  turnType:
    | 'plan'
    | 'handoff_note'
    | 'review_request'
    | 'review_response'
    | 'clarification'
    | 'finding'
    | 'decision_input'
    | 'human_note'

  status:
    | 'draft'
    | 'recorded'
    | 'queued_for_review'
    | 'approved_record'
    | 'rejected'
    | 'superseded'
    | 'archived'

  title: string
  body: string
  inputSnapshot?: Json
  outputSnapshot?: Json
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  requiresHumanConfirmation: boolean
  confirmationArtifactId?: string

  createdBy: 'human' | 'system' | 'agent_record'
  createdAt: string
  updatedAt: string
}
```

## Sequence Rule

`seq` must be monotonically increasing per `threadId`.

Creating a turn must not automatically create another turn.

## Safety Invariants

- A2ATurn is a local record only.
- A2ATurn creation must not dispatch A2AMessage.
- A2ATurn approval must not start speaker or audience Agents.
- A2ATurn approval must not execute tools or write Memory / Knowledge.
- A2ATurn must store sanitized snapshots only.

