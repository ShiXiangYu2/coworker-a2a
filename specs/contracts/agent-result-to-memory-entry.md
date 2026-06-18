# Contract: AgentResult to MemoryEntry Candidate

Status: proposed for Sprint 5

## Purpose

This contract defines how a Sprint 4 AgentResult can propose MemoryEntry candidates.

The flow creates reviewable candidates only. It does not create approved memory, write external knowledge stores, run tools, or trigger Agent execution.

## Input

```ts
{
  agentRunId: string
  taskId: string
  agentId: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  agentResult: AgentResult
  selectedFindings?: number[]
  selectedProposedChanges?: number[]
  idempotencyKey?: string
}
```

## Candidate Rules

AgentResult may create MemoryEntry candidates from:

- stable findings
- explicit decisions
- workflow notes
- technical context
- safety notes
- user preference observations that are clearly scoped

AgentResult must not directly create `approved` MemoryEntry records.

Created records use:

```text
MemoryEntry.status = candidate
MemoryEntry.sourceType = agent_result
MemoryEntry.sourceId = agentRunId
MemoryEntry.proposedBy = agent
```

## Blockers

Reject candidate creation when:

- AgentResult is invalid
- AgentResult.sideEffects contains any non-empty array
- content claims tools, files, Git, PRs, deploys, deletes, external APIs, or message sends happened
- content includes secrets, API keys, tokens, or full sensitive payloads
- candidate cannot be traced to a source AgentResult

## Human Review Boundary

Kelvin / Human Owner review is required before candidate memory becomes approved.

High-risk candidates must remain candidate or be rejected until reviewed:

- safety policy
- production, deploy, database, permission, secret, or migration topics
- user preference intended to persist globally
- customer-sensitive content
- future Tool Runtime or A2A execution guidance

## Output

```ts
{
  memoryEntries: MemoryEntry[]
  auditEvents: AuditEvent[]
}
```

## Audit Events

Creation must write:

```text
memory.candidate_created
```

Approval, rejection, supersession, and archive happen through MemoryEntry review APIs.

## Safety Invariants

- AgentResult to MemoryEntry creates candidates only.
- Approval is a separate human review action.
- Approval does not run Agent, Tool Runtime, shell, Git, file writes, PRs, deploys, deletes, external APIs, A2A messages, or memory sync.
