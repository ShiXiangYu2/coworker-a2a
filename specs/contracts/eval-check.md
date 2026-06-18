# Contract: EvalCheck

Status: proposed for Sprint 7

## Purpose

EvalCheck is one deterministic checklist item evaluated during an EvalRun.

It captures structured pass / warning / failure results that can be aggregated into findings and a QualityGateDecision.

## Schema

```ts
EvalCheck {
  id: string
  evalRunId: string
  evalTargetId: string

  checkKey: string
  title: string
  category:
    | 'schema'
    | 'state_machine'
    | 'safety'
    | 'permission'
    | 'confirmation'
    | 'quality'
    | 'consistency'
    | 'regression'
    | 'provenance'
  status: 'passed' | 'warned' | 'failed' | 'blocked' | 'skipped'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  confidence: number

  targetPath?: string
  targetField?: string
  evidence: string[]
  evidenceRefs?: string[]
  recommendation?: string
  createdAt: string
}
```

## Check Categories

- `schema`: required fields, valid enums, confidence range, structured output.
- `state_machine`: legal target state and transition compatibility.
- `safety`: no side effects, no prohibited claims, no hidden execution path.
- `permission`: CommandPolicy and ToolPermission compatibility.
- `confirmation`: human review boundary and pending approval checks.
- `quality`: clarity, completeness, and actionable findings.
- `consistency`: target snapshot aligns with linked records.
- `regression`: prior Sprint capability is not contradicted.
- `provenance`: source, audit, and snapshot traceability.

## Locator Fields

`targetPath`, `targetField`, and `evidenceRefs` are optional UI and audit helpers.

They must be sanitized. They must not contain:

- secrets
- full file contents
- full command output
- raw external API payloads
- private tokens
- environment variable dumps

## Safety Invariants

- EvalCheck must be computed from local snapshots and local records only.
- EvalCheck must not read files, network resources, MCP, browser, external APIs, or shell output.
- EvalCheck status must not mutate target records.
