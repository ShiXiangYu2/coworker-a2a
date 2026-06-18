import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const apiRoot = join(process.cwd(), 'src', 'app', 'api')

describe('Sprint 8 API route safety', () => {
  it('does not add execution-oriented observability/recovery/resume routes', () => {
    const routes = collectRoutes(apiRoot)
      .map((file) => relative(apiRoot, file).replaceAll('\\', '/'))
      .filter((file) =>
        file.startsWith('observability/') ||
        file.startsWith('audit/') ||
        file.startsWith('run-journals/') ||
        file.startsWith('recovery-points/') ||
        file.startsWith('resume-tokens/') ||
        file.startsWith('failures/')
      )

    const forbidden = [
      'execute-fix',
      'apply',
      'block-task',
      'complete-task',
      'replay',
      'retry',
      'restore-and-run',
      'resume-execution',
      'start-agent',
      'run-tool',
      'dispatch-a2a',
      'auto-fix',
    ]
    for (const route of routes) {
      for (const fragment of forbidden) {
        expect(route).not.toContain(fragment)
      }
    }
  })
})

function collectRoutes(dir: string): string[] {
  const entries = readdirSync(dir)
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      files.push(...collectRoutes(full))
    } else if (entry === 'route.ts') {
      files.push(full)
    }
  }
  return files
}

