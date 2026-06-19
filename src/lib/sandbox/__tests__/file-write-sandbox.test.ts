import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  normalizeSandboxTargetPath,
  validateSandboxFileWriteInput,
  writeSandboxDeliverable,
} from '../file-write-sandbox'

describe('Sprint 22 file write sandbox', () => {
  it('writes only approved deliverable extensions under deliverables', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'coworker-a2a-sandbox-'))
    const result = await writeSandboxDeliverable(
      {
        targetPath: 'deliverables/sprint-22/receipt.md',
        content: '# Receipt',
        format: 'md',
      },
      { projectRoot }
    )

    expect(result.relativePath).toBe('deliverables/sprint-22/receipt.md')
    expect(result.extension).toBe('.md')
    expect(result.bytesWritten).toBe(Buffer.byteLength('# Receipt'))
    expect(await readFile(result.outputPath, 'utf8')).toBe('# Receipt')
  })

  it('rejects path traversal and non-allowlisted extensions', () => {
    expect(() => normalizeSandboxTargetPath('../src/app/page.ts')).toThrow(/deliverables/)
    expect(() =>
      validateSandboxFileWriteInput({
        targetPath: 'deliverables/bad.ts',
        content: 'x',
        format: 'txt',
      })
    ).not.toThrow()
    expect(() => normalizeSandboxTargetPath('deliverables/bad.ts')).toThrow(/extension/)
  })
})
