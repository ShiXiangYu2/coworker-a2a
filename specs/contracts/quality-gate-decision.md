# Contract: QualityGateDecision

Status: proposed for Sprint 7

## Purpose

QualityGateDecision summarizes whether an evaluated target is acceptable, risky, failed, requires human review, or blocked.

Sprint 7 gate decisions are recommendations only.

## Schema

```ts
QualityGateDecision {
  gateVersion: string
  sourceEvalRunId: string
  checkIds: string[]
  findingIds: string[]
  decision: 'pass' | 'warn' | 'fail' | 'needs_human_review' | 'blocked'
  confidence: number
  summary: string
  reasons: string[]
  requiredActions: string[]
  recommendedOwnerAgentId?: 'elon' | 'jobs' | 'linus' | 'turing' | 'bezos' | 'kelvin'
  blocksFutureExecutionRecommendation: boolean
  requiresKelvinReview: boolean
  evaluatedAt: string
}
```

## Decision Meaning

- `pass`: target appears acceptable for its current Sprint boundary.
- `warn`: target is usable but has non-blocking issues.
- `fail`: target violates expected quality or contract requirements.
- `needs_human_review`: human review is recommended before relying on the target.
- `blocked`: target should not be used until issues are addressed.

## Aggregation Rules

- Any critical safety failure should produce `blocked` or `needs_human_review`.
- Any high severity finding should produce `fail`, `needs_human_review`, or `blocked`.
- Any non-empty sideEffects on analysis-only outputs should produce `blocked`.
- Missing confirmation for high-risk targets should produce `needs_human_review`.
- Low confidence should produce `warn` or `needs_human_review`.

## Recommendation-only Boundary

`blocksFutureExecutionRecommendation = true` is advisory only in Sprint 7.

It must not automatically:

- block a Task
- complete a Task
- cancel an AgentRun
- approve or reject Memory / Knowledge / A2A / ToolCall records
- create ToolCalls
- start tools
- send messages
- mutate files

Future sprints may decide how to enforce gates, but Sprint 7 only records the recommendation.
