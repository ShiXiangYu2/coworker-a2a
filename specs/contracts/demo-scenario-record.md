# Contract: DemoScenarioRecord

Status: proposed for Sprint 15

## Purpose

DemoScenarioRecord is a local, human-readable record that describes an MVP demo path through Sprint 1-14 records. It is a script and evidence chain only; it does not execute demo steps.

## Fields

- `id: string`
- `title: string`
- `summary: string`
- `targetSprint: 'sprint_15'`
- `baselineSprints: string[]`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `scenarioKind: 'happy_path' | 'safety_boundary' | 'regression' | 'governance_review' | 'demo_script'`
- `entryPoint: 'chathub' | 'task_ui' | 'governance_console' | 'api_readonly'`
- `orderedEvidenceRefs: MVPDemoEvidenceRef[]`
- `expectedScreens: string[]`
- `expectedLocalRecords: string[]`
- `forbiddenRuntimeActions: string[]`
- `demoScriptMarkdown: string`
- `seedDataRefs: string[]`
- `canExecute: false`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `createdBy: 'user' | 'operator' | 'agent_record' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Demo Evidence Ref

```ts
type MVPDemoEvidenceRef = {
  sourceType: string
  sourceId?: string
  displayLabel: string
  summary: string
  redactionStatus: 'sanitized' | 'redacted'
  isExecutionToken: false
}
```

## Rules

- DemoScenarioRecord must describe expected local UI and record views only.
- It must not execute the demo path.
- `forbiddenRuntimeActions` must include execution, deploy, release, publish, task completion, retry, replay, rollback, and resume actions.
- `demoScriptMarkdown` must not include instructions to run commands, write files, call APIs, connect MCP, create PRs, deploy, publish, or release.
- `approved_record` means the local demo script record is approved for human presentation only.

## Sprint 16 Display Boundary

Sprint 16 MVPOperatorConsole may display DemoScenarioRecord as a read-only demo path.

- The demo path must remain a script and evidence chain only.
- Displaying DemoScenarioRecord must not execute demo steps or mutate source records.
- `approved_record` remains approval for human presentation only, not execution, release, deploy, publish, or task completion.
