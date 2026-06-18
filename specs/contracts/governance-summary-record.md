# Contract: GovernanceSummaryRecord

Status: proposed for Sprint 15

## Purpose

GovernanceSummaryRecord is a local, auditable summary of Sprint 1-14 governance coverage. It describes safety boundaries and evidence coverage without granting permission or triggering actions.

## Fields

- `id: string`
- `title: string`
- `summary: string`
- `targetSprint: 'sprint_15'`
- `coveredSprints: string[]`
- `status: 'draft' | 'review' | 'approved_record' | 'rejected' | 'archived'`
- `recordCountsByType: Record<string, number>`
- `safetyBoundarySummary: string`
- `defaultDenySummary: string`
- `humanConfirmationSummary: string`
- `auditCoverageSummary: string`
- `observabilityCoverageSummary: string`
- `recoveryCoverageSummary: string`
- `evalCoverageSummary: string`
- `regressionEvidenceRefs: string[]`
- `releaseReadinessRefs: string[]`
- `knownLimitations: string[]`
- `riskFindings: string[]`
- `isExecutionToken: false`
- `isReleaseToken: false`
- `isDeployToken: false`
- `createdBy: 'user' | 'operator' | 'agent_record' | 'system_seed'`
- `correlationId: string`
- `auditRefs: string[]`
- `createdAt: string`
- `updatedAt: string`
- `archivedAt?: string`

## Rules

- GovernanceSummaryRecord must cover local governance and safety evidence only.
- It must not grant permissions.
- It must not satisfy Kelvin confirmation.
- It must not approve future records automatically.
- It must not execute, release, deploy, publish, complete Task, retry, replay, rollback, restore, or resume anything.
- `approved_record` means the summary was approved as a local governance artifact only.

## Sprint 16 Display Boundary

Sprint 16 MVPOperatorConsole and MVPSafetyMatrixView may display GovernanceSummaryRecord as sanitized governance evidence only.

- Displaying GovernanceSummaryRecord must not grant permission.
- Displaying GovernanceSummaryRecord must not satisfy Kelvin confirmation.
- Displaying GovernanceSummaryRecord must not mutate source records.
- GovernanceSummaryRecord remains non-executable and cannot become an execution, release, deploy, publish, or task completion token.
