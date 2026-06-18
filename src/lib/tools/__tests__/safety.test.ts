import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenSourceTokens = [
  'writeFile',
  'appendFile',
  'unlink',
  'rm(',
  'exec(',
  'spawn(',
  'fetch(',
]

const forbiddenRouteSegments = [
  '/execute-any',
  '/run-command',
  '/run-shell',
  '/shell',
  '/git',
  '/file-read',
  '/file-write',
  '/patch',
  '/format',
  '/create-pr',
  '/deploy',
  '/delete',
  '/external',
  '/mcp',
  '/browser',
  '/database-migration',
  '/retry',
  '/replay',
  '/rollback',
  '/resume-execution',
  '/auto-approve',
  '/continue-agent',
  '/dispatch',
  '/start',
]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('Sprint 6 tool safety boundary', () => {
  it('does not import forbidden side-effect paths in tool library', () => {
    // Sprint 19: executor.ts and agent-tools.ts are excluded because they intentionally implement tool execution
    // state-machine.ts and types.ts are excluded because they define tool state constants
    const sourceFiles = files(join(process.cwd(), 'src/lib/tools')).filter(
      (file) => file.endsWith('.ts') && !file.includes('__tests__') && !file.includes('executor.ts') && !file.includes('agent-tools.ts') && !file.includes('state-machine.ts') && !file.includes('types.ts')
    )
    const combined = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

    for (const token of forbiddenSourceTokens) {
      expect(combined).not.toContain(token)
    }
  })

  it('does not define forbidden execution-semantics tool API route paths except execute-approved', () => {
    const routeFiles = [
      ...files(join(process.cwd(), 'src/app/api/tool-calls')),
      ...files(join(process.cwd(), 'src/app/api/tool-runs')),
      ...files(join(process.cwd(), 'src/app/api/tool-confirmations')),
      ...files(join(process.cwd(), 'src/app/api/tools')),
    ].filter((file) => file.endsWith('route.ts'))

    for (const file of routeFiles) {
      const normalized = file.replace(/\\/g, '/')
      if (normalized.includes('/tool-runs/[id]/external-action-proposals/')) continue
      for (const segment of forbiddenRouteSegments) {
        expect(normalized).not.toContain(segment)
      }
      if (normalized.includes('/execute')) {
        expect(normalized).toContain('/execute-approved/')
      }
    }
  })
})
