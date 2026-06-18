import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenSourceTokens = [
  'child_process',
  'writeFile',
  'appendFile',
  'unlink',
  'rm(',
  'exec(',
  'spawn(',
  'fetch(',
]

const forbiddenRouteSegments = [
  'execute-fix',
  'apply',
  'block-task',
  'complete-task',
]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('Sprint 7 eval safety boundary', () => {
  it('does not import forbidden side-effect paths in eval library', () => {
    const sourceFiles = files(join(process.cwd(), 'src/lib/eval')).filter(
      (file) => file.endsWith('.ts') && !file.includes('__tests__')
    )
    const combined = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

    for (const token of forbiddenSourceTokens) {
      expect(combined).not.toContain(token)
    }
  })

  it('does not define auto-fix or target-mutating eval API route paths', () => {
    const routeFiles = files(join(process.cwd(), 'src/app/api')).filter(
      (file) => file.endsWith('route.ts') && file.replace(/\\/g, '/').includes('/eval')
    )

    for (const file of routeFiles) {
      const normalized = file.replace(/\\/g, '/')
      for (const segment of forbiddenRouteSegments) {
        expect(normalized).not.toContain(segment)
      }
    }
  })
})
