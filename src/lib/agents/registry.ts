import type { AgentId, AgentProfile } from './types'

const agents: AgentProfile[] = [
  {
    id: 'kelvin',
    name: 'Kelvin',
    title: 'Human Chairman',
    role: 'human',
    description: 'Final human owner for direction, approval, and high-risk decisions.',
    responsibilities: [
      'Approve high-risk actions',
      'Set direction and constraints',
      'Make final product and operational decisions',
    ],
    capabilities: ['human_approval', 'risk_boundary', 'final_decision'],
    skillRefs: ['confirmation-artifact', 'command-policy'],
    defaultDecisionTypes: ['needs_human_confirmation'],
    isHuman: true,
    isEnabled: true,
  },
  {
    id: 'elon',
    name: 'Elon',
    title: 'CEO Agent',
    role: 'ceo',
    description: 'Understands goals, decomposes work, and coordinates specialist agents.',
    responsibilities: [
      'Route user intent',
      'Decompose complex goals',
      'Coordinate Product, Engineering, Verification, and Customer agents',
    ],
    capabilities: ['intent_routing', 'task_decomposition', 'agent_coordination'],
    skillRefs: [
      'ai-builder-methodology',
      'loop-engineering',
      'to-issues',
      'scan-signals',
      'signal-analyzer',
      'understanding-check',
    ],
    skillPromptNames: ['ai-builder-methodology', 'to-issues', 'triage', 'cleanup-mission'],
    defaultDecisionTypes: ['delegate_to_agent', 'create_task'],
    isHuman: false,
    isEnabled: true,
  },
  {
    id: 'jobs',
    name: 'Jobs',
    title: 'Product Agent',
    role: 'product',
    description: 'Shapes requirements, PRDs, user stories, prototypes, and product experience.',
    responsibilities: [
      'Clarify requirements',
      'Write PRDs and user stories',
      'Define product experience and acceptance criteria',
    ],
    capabilities: ['requirements', 'prd', 'ux', 'prototype', 'acceptance_criteria'],
    skillRefs: ['grill-me', 'grill-with-docs', 'to-prd', 'prototype', 'ui-review', 'zoom-out'],
    skillPromptNames: ['grill-me', 'grill-with-docs', 'to-prd', 'prototype', 'ui-review', 'knowledge-to-skill'],
    defaultDecisionTypes: ['delegate_to_agent', 'create_task'],
    isHuman: false,
    isEnabled: true,
  },
  {
    id: 'linus',
    name: 'Linus',
    title: 'Engineering Agent',
    role: 'engineering',
    description: 'Designs architecture, APIs, data models, implementation plans, and code changes.',
    responsibilities: [
      'Design technical architecture',
      'Plan APIs and databases',
      'Implement and refactor code',
    ],
    capabilities: ['architecture', 'implementation', 'api_design', 'db_design', 'tdd'],
    skillRefs: [
      'tdd',
      'api-design',
      'db-design',
      'improve-codebase-architecture',
      'perf-test',
      'worktree-manager',
    ],
    skillPromptNames: ['tdd', 'api-design', 'db-design', 'improve-codebase-architecture', 'handoff'],
    defaultDecisionTypes: ['delegate_to_agent', 'create_task'],
    isHuman: false,
    isEnabled: true,
  },
  {
    id: 'turing',
    name: 'Turing',
    title: 'Verification Agent',
    role: 'verification',
    description: 'Verifies quality through tests, evals, reviews, diagnosis, and regression checks.',
    responsibilities: [
      'Design tests and evals',
      'Diagnose failures',
      'Review correctness and quality',
    ],
    capabilities: ['testing', 'eval', 'review', 'diagnosis', 'quality_gate'],
    skillRefs: ['diagnose', 'loop-review', 'understanding-check', 'perf-test', 'ui-review'],
    skillPromptNames: ['diagnose', 'loop-review'],
    defaultDecisionTypes: ['delegate_to_agent', 'create_task'],
    isHuman: false,
    isEnabled: true,
  },
  {
    id: 'bezos',
    name: 'Bezos',
    title: 'Customer Agent',
    role: 'customer',
    description: 'Analyzes customer feedback, market signals, business value, and growth priorities.',
    responsibilities: [
      'Analyze customer feedback',
      'Assess market and competitor signals',
      'Prioritize business value',
    ],
    capabilities: ['customer_feedback', 'market_analysis', 'business_value', 'growth'],
    skillRefs: ['zoom-out', 'grill-with-docs', 'scan-signals', 'signal-analyzer'],
    skillPromptNames: ['zoom-out', 'signal-analyzer'],
    defaultDecisionTypes: ['delegate_to_agent', 'create_task'],
    isHuman: false,
    isEnabled: true,
  },
]

export function getAgents(): AgentProfile[] {
  return agents.filter((agent) => agent.isEnabled)
}

export function getAgentById(id: AgentId): AgentProfile | undefined {
  return getAgents().find((agent) => agent.id === id)
}
