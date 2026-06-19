import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Sprint 22 acceptance checklist docs', () => {
  it('documents the Sprint 22 acceptance checklist sections and scope', () => {
    const source = readFileSync(join(process.cwd(), 'docs/sprint-22-acceptance-checklist.md'), 'utf8')

    expect(source).toContain('## Scope / Baseline')
    expect(source).toContain('## Data Model Readiness')
    expect(source).toContain('## Token Gate Readiness')
    expect(source).toContain('## Replay / Idempotency Guard Readiness')
    expect(source).toContain('## Dry-Run Lifecycle Readiness')
    expect(source).toContain('## Controlled Obsidian Write Readiness')
    expect(source).toContain('## Run-Once / Verify Helper Readiness')
    expect(source).toContain('## Audit / Query API Readiness')
    expect(source).toContain('## Operator Console Read-Only Readiness')
    expect(source).toContain('## Smoke Flow Readiness')
    expect(source).toContain('## Hard-Denied Capability Checklist')
    expect(source).toContain('## Open Follow-Ups / Explicitly Deferred Items')
    expect(source).toContain('## Minimum Acceptance Standard')
    expect(source).toContain('obsidian_local.write_local_markdown_draft')
  })

  it('locks hard-denied capabilities and deferred items in the checklist', () => {
    const source = readFileSync(join(process.cwd(), 'docs/sprint-22-acceptance-checklist.md'), 'utf8')

    expect(source).toContain('shell remains denied')
    expect(source).toContain('Git / PR remains denied')
    expect(source).toContain('deploy remains denied')
    expect(source).toContain('MCP remains denied')
    expect(source).toContain('external API remains denied')
    expect(source).toContain('Tool Registry remains denied')
    expect(source).toContain('arbitrary file write remains denied')
    expect(source).toContain('long-running worker daemon is deferred')
    expect(source).toContain('queue scanning service is deferred')
    expect(source).toContain('multi connector / multi step execution is deferred')
    expect(source).toContain('UI-side execution controls are deferred')
  })

  it('links smoke flow, operator panel, dry-run verify, and runbook handoff artifacts', () => {
    const checklist = readFileSync(join(process.cwd(), 'docs/sprint-22-acceptance-checklist.md'), 'utf8')
    const runbook = readFileSync(join(process.cwd(), 'docs/runtime-execution-runbook.md'), 'utf8')

    expect(checklist).toContain('docs/runtime-panel-smoke-flow.md')
    expect(checklist).toContain('Dry-run verify')
    expect(checklist).toContain('RuntimeExecutionPanel')
    expect(checklist).toContain('Timeline, receipt, recovery, task summary, and operator view APIs')
    expect(runbook).toContain('docs/sprint-22-acceptance-checklist.md')
  })
})
