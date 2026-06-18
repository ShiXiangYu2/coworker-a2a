import { describe, expect, it } from 'vitest'
import { commandPolicy, findToolByIdOrName } from '../registry'
import { evaluateToolPermission } from '../policy'
import type { ToolCall } from '../types'

const now = new Date().toISOString()

function call(overrides: Partial<ToolCall>): ToolCall {
  return {
    id: 'call-1',
    source: 'agent_result',
    toolId: 'noop.note',
    toolName: 'noop.note',
    intent: 'Record note',
    rationale: 'Local proposal only.',
    input: { note: 'hello' },
    inputSummary: 'hello',
    status: 'proposed',
    riskLevel: 'low',
    sideEffects: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('Sprint 6 CommandPolicy default-deny', () => {
  it('keeps command policy default deny with no allowed commands', () => {
    expect(commandPolicy.defaultDecision).toBe('deny')
    expect(commandPolicy.profiles[0].allowedCommands).toEqual([])
    expect(commandPolicy.profiles[0].deniedCommands).toContain('*')
  })

  it('allows only record-only decision for safe local noop proposal', () => {
    const permission = evaluateToolPermission(call({}))
    expect(permission.decision).toBe('allow_record_only')
    expect(permission.inputValidationStatus).toBe('valid')
  })

  it('blocks unknown and disabled tools', () => {
    expect(evaluateToolPermission(call({ toolId: 'unknown', toolName: 'unknown' })).decision).toBe('blocked')
    expect(evaluateToolPermission(call({ toolId: 'command.shell', toolName: 'command.shell', input: { command: 'npm test' } })).decision).toBe('blocked')
  })

  it('read tools remain proposal-only and do not expose real read behavior', () => {
    const tool = findToolByIdOrName('read.project_context')
    expect(tool?.category).toBe('read')
    expect(tool?.sprint6Mode).toBe('proposal_only')
    expect(tool?.description).toContain('never reads files')
  })

  it('marks invalid input without execution permission', () => {
    const permission = evaluateToolPermission(call({ input: {} }))
    expect(permission.inputValidationStatus).toBe('invalid')
    expect(permission.decision).toBe('deny')
  })
})
