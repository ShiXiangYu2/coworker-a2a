# Contract: A2AThread

Status: proposed for Sprint 9

## Purpose

A2AThread groups ordered local A2ATurn records inside a CollaborationSession.

It is a local discussion thread, not a transport channel.

## Schema

```ts
A2AThread {
  id: string
  idempotencyKey?: string
  correlationId: string
  collaborationSessionId: string
  taskId?: string

  status:
    | 'draft'
    | 'open'
    | 'waiting_human'
    | 'closed_record'
    | 'blocked'
    | 'cancelled'
    | 'archived'

  topic: string
  purpose:
    | 'handoff'
    | 'review'
    | 'planning'
    | 'clarification'
    | 'decision'
    | 'customer_feedback'

  participantAgentIds: ('elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin')[]
  latestTurnSeq: number
  createdBy: 'human' | 'system' | 'agent_record'
  createdAt: string
  updatedAt: string
}
```

## Ordering Rule

`latestTurnSeq` is informational. The source of truth is the max `A2ATurn.seq` per `threadId`.

Queries must sort turns by `seq`.

## Safety Invariants

- A2AThread does not send messages.
- Opening a thread does not start Agents.
- Closing a thread does not complete Task.
- A2AThread must not be backed by a queue, worker, message broker, webhook, or external transport.

