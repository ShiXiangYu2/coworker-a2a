import { describe, expect, it } from 'vitest'
import { getAgentById, getAgents } from '../registry'

describe('Agent registry', () => {
  it('returns the six initial company members', () => {
    expect(getAgents().map((agent) => agent.id)).toEqual([
      'kelvin',
      'elon',
      'jobs',
      'linus',
      'turing',
      'bezos',
    ])
  })

  it('marks Kelvin as the human chairman', () => {
    const kelvin = getAgentById('kelvin')
    expect(kelvin?.isHuman).toBe(true)
    expect(kelvin?.role).toBe('human')
  })

  it('defines Elon as the CEO agent', () => {
    const elon = getAgentById('elon')
    expect(elon?.role).toBe('ceo')
    expect(elon?.capabilities).toContain('intent_routing')
  })
})
