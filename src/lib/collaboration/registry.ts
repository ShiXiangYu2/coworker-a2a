import type { AgentTeam } from './types'

const now = '2026-06-16T00:00:00.000Z'

export const agentTeams: AgentTeam[] = [
  {
    id: 'default_company_team',
    name: 'Default Company Team',
    purpose: 'CEO-led local collaboration across product, engineering, verification, and customer perspectives.',
    status: 'active',
    leadAgentId: 'elon',
    memberAgentIds: ['elon', 'jobs', 'linus', 'turing', 'bezos'],
    collaborationMode: 'ceo_led',
    riskTier: 'medium',
    defaultRequiresHumanConfirmation: true,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'product_engineering_review',
    name: 'Product Engineering Review',
    purpose: 'Local product, engineering, and verification review record flow.',
    status: 'active',
    leadAgentId: 'jobs',
    memberAgentIds: ['jobs', 'linus', 'turing'],
    collaborationMode: 'product_engineering_review',
    riskTier: 'medium',
    defaultRequiresHumanConfirmation: true,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'customer_feedback_review',
    name: 'Customer Feedback Review',
    purpose: 'Local customer impact review with product and verification perspectives.',
    status: 'active',
    leadAgentId: 'bezos',
    memberAgentIds: ['bezos', 'jobs', 'turing'],
    collaborationMode: 'customer_feedback_review',
    riskTier: 'low',
    defaultRequiresHumanConfirmation: false,
    createdBy: 'system',
    createdAt: now,
    updatedAt: now,
  },
]

export function getAgentTeam(id: string) {
  return agentTeams.find((team) => team.id === id) ?? null
}

