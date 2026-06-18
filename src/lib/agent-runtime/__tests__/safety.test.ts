import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbidden = [
  'child_process',
  'writeFile',
  'appendFile',
  'unlink',
  'rm(',
  'MemoryEntry',
]

// Files that are allowed to contain tool-related code (safe, read-only tool runtime)
const allowedFiles = ['tool-runtime.ts']

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('Agent Runtime safety boundary', () => {
  it('does not import forbidden side-effect modules or helpers', () => {
    const sourceFiles = files(join(process.cwd(), 'src/lib/agent-runtime')).filter(
      (file) =>
        file.endsWith('.ts') &&
        !file.includes('__tests__') &&
        !allowedFiles.some((allowed) => file.endsWith(allowed))
    )
    const combined = sourceFiles.map((file) => readFileSync(file, 'utf8')).join('\n')

    for (const token of forbidden) {
      expect(combined).not.toContain(token)
    }
  })
})
