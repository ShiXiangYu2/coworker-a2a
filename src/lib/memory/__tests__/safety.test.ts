import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const forbidden = [
  'child_process',
  'ToolRuntime',
  'ToolCall',
  'ToolRun',
  'A2AWorker',
  'MessageQueue',
  'VectorIndex',
  'Embedding',
  'Obsidian',
]

describe('Sprint 5 forbidden side-effect paths', () => {
  it('does not import forbidden runtime paths in memory modules', () => {
    const dir = path.join(process.cwd(), 'src', 'lib', 'memory')
    const files = fs.readdirSync(dir).filter((file) => file.endsWith('.ts'))
    const text = files.map((file) => fs.readFileSync(path.join(dir, file), 'utf8')).join('\n')

    for (const token of forbidden) {
      expect(text).not.toContain(`from '${token}'`)
      expect(text).not.toContain(`from "${token}"`)
    }
  })
})
