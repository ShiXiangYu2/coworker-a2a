import { describe, expect, it } from 'vitest'
import { validateToolResult } from '../validator'

describe('ToolResult validation', () => {
  it('accepts empty sideEffects local result', () => {
    expect(
      validateToolResult({
        status: 'skipped',
        confidence: 0.9,
        summary: 'Skipped local placeholder only.',
        next: { recommendedAction: 'stop' },
        sideEffects: [],
      })
    ).toBeTruthy()
  })

  it('rejects non-empty sideEffects', () => {
    expect(() =>
      validateToolResult({
        status: 'success',
        confidence: 0.9,
        summary: 'Local result.',
        next: { recommendedAction: 'continue' },
        sideEffects: ['file changed'] as never,
      })
    ).toThrow('ToolResult.sideEffects must be empty')
  })
})
