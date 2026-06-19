import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Sprint 22 closeout docs', () => {
  it('documents completed scope, deferred work, risks, next steps, and handoff prompt', () => {
    const source = readFileSync(
      join(process.cwd(), 'specs/sprint-22-controlled-runtime-execution/closeout.md'),
      'utf8',
    )

    expect(source).toContain('## Completed Scope')
    expect(source).toContain('## What Remains Deferred')
    expect(source).toContain('## Known Risks / Non-goals')
    expect(source).toContain('## Recommended Next P0 / P1')
    expect(source).toContain('## Suggested Handoff Prompt')
  })

  it('freezes the runtime safety boundary and current operator posture', () => {
    const source = readFileSync(
      join(process.cwd(), 'specs/sprint-22-controlled-runtime-execution/closeout.md'),
      'utf8',
    )

    expect(source).toContain('obsidian_local.write_local_markdown_draft')
    expect(source).toContain('default validation path remains `dry_run`')
    expect(source).toContain('Operator Console is a read-only observation layer')
    expect(source).toContain('Hard-denied capabilities remain outside this phase')
    expect(source).toContain('shell')
    expect(source).toContain('Git / PR')
    expect(source).toContain('deploy')
    expect(source).toContain('MCP')
    expect(source).toContain('external API')
    expect(source).toContain('Tool Registry')
    expect(source).toContain('arbitrary file write')
  })

  it('links the main runbook to the closeout document', () => {
    const source = readFileSync(join(process.cwd(), 'docs/runtime-execution-runbook.md'), 'utf8')

    expect(source).toContain('specs/sprint-22-controlled-runtime-execution/closeout.md')
  })
})
