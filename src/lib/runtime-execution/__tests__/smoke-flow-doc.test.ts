import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Sprint 22 runtime panel smoke flow docs', () => {
  it('documents the runtime panel smoke flow and hard-denied boundaries', () => {
    const source = readFileSync(join(process.cwd(), 'docs/runtime-panel-smoke-flow.md'), 'utf8')

    expect(source).toContain('scripts/runtime-seed-sample-job.ts')
    expect(source).toContain('/operator?runtimeTaskId=<task-id>')
    expect(source).toContain('scripts/runtime-verify-once.ts')
    expect(source).toContain('GET /api/runtime/jobs/<job-id>/timeline')
    expect(source).toContain('GET /api/runtime/jobs/<job-id>/receipt')
    expect(source).toContain('GET /api/runtime/jobs/<job-id>/recovery')
    expect(source).toContain('GET /api/tasks/<task-id>/runtime-summary')
    expect(source).toContain('GET /api/tasks/<task-id>/runtime-operator-view')
    expect(source).toContain('no worker daemon')
    expect(source).toContain('no queue scanning')
    expect(source).toContain('no shell/Git/PR/deploy/MCP/external API')
    expect(source).toContain('no Tool Registry')
    expect(source).toContain('no arbitrary file write')
    expect(source).toContain('no Obsidian write unless explicitly running the separate controlled `obsidian_write` path')
  })

  it('does not present obsidian_write as the default smoke path', () => {
    const source = readFileSync(join(process.cwd(), 'docs/runtime-panel-smoke-flow.md'), 'utf8')

    expect(source).toContain('The default smoke path is dry-run only.')
    expect(source).not.toContain('Run `obsidian_write` first')
  })

  it('links the main runbook to the smoke flow document', () => {
    const source = readFileSync(join(process.cwd(), 'docs/runtime-execution-runbook.md'), 'utf8')

    expect(source).toContain('docs/runtime-panel-smoke-flow.md')
  })
})
