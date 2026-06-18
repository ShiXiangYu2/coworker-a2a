import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { TaskBoard } from '../task-board'
import { AgentStats } from '../agent-stats'
import { AuditTimeline } from '../audit-timeline'
import { MultiAgentFlow } from '../multi-agent-flow'
import { EvalPanel } from '../eval-panel'
import { OperatorOverview } from '../operator-overview'
import { ToolBoundaryPanel } from '../tool-boundary-panel'
import { DepartmentPanel } from '../department-panel'
import { DepartmentEvidenceMapPanel } from '../department-evidence-map-panel'
import { ExecutionGatewayPanel } from '../execution-gateway-panel'
import { DepartmentAssignmentPanel } from '../department-assignment-panel'
import { lifecycleStatuses } from '../ui'

const forbiddenRuntimeLabels = [
  'Run Execution',
  'Execute Now',
  'Route Task',
  'Auto Route',
  'Assign Agent',
  'Assign Runtime Agent',
  'Start Agent',
  'Continue Agent',
  'Run Agent',
  'Run Tool',
  'Execute Workflow',
  'Grant Permission',
  'Request Permission',
  'Apply Change',
  'Write File',
  'Run Git',
  'Call API',
  'Connect MCP',
  'Create PR',
  'Deploy',
  'Publish',
  'Release',
  'Complete Task',
  'Retry',
  'Replay',
  'Rollback',
  'Restore',
  'Resume Execution',
]

function readOperatorSource(file: string) {
  return readFileSync(join(process.cwd(), 'src', 'components', 'operator-console', file), 'utf8')
}

describe('Operator Console Components', () => {
  it('exports function components for all v1 console panels', () => {
    expect(typeof TaskBoard).toBe('function')
    expect(typeof AgentStats).toBe('function')
    expect(typeof AuditTimeline).toBe('function')
    expect(typeof MultiAgentFlow).toBe('function')
    expect(typeof EvalPanel).toBe('function')
    expect(typeof OperatorOverview).toBe('function')
    expect(typeof ToolBoundaryPanel).toBe('function')
    expect(typeof DepartmentPanel).toBe('function')
    expect(typeof DepartmentEvidenceMapPanel).toBe('function')
    expect(typeof ExecutionGatewayPanel).toBe('function')
    expect(typeof DepartmentAssignmentPanel).toBe('function')
  })
})

describe('Operator Console Index', () => {
  it('exports all console panels without exposing an execution panel', async () => {
    const index = await import('../index')
    expect(index.TaskBoard).toBeDefined()
    expect(index.AgentStats).toBeDefined()
    expect(index.AuditTimeline).toBeDefined()
    expect(index.MultiAgentFlow).toBeDefined()
    expect(index.EvalPanel).toBeDefined()
    expect(index.OperatorOverview).toBeDefined()
    expect(index.ToolBoundaryPanel).toBeDefined()
    expect(index.DepartmentPanel).toBeDefined()
    expect(index.DepartmentEvidenceMapPanel).toBeDefined()
    expect(index.ExecutionGatewayPanel).toBeDefined()
    expect(index.DepartmentAssignmentPanel).toBeDefined()
    expect('ExecutionPanel' in index).toBe(false)
  })
})

describe('v1 frontend closure polish', () => {
  it('keeps Sprint 17-21 console entrypoints visible in the operator page', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'operator', 'page.tsx'), 'utf8')

    expect(source).toContain('Operator Console')
    expect(source).toContain('Evidence Sandbox')
    expect(source).toContain('Department Profiles')
    expect(source).toContain('Evidence Mapping')
    expect(source).toContain('Execution Gateway')
    expect(source).toContain('Assignment Review')
    expect(source).toContain('local-only / human-gated / evidence-only / recommendation-only')
    expect(source).toContain('DepartmentEvidenceMapPanel')
    expect(source).toContain('ExecutionGatewayPanel')
    expect(source).toContain('DepartmentAssignmentPanel')
  })

  it('keeps ChatHub linked to the Operator Console with v1 local governance copy', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf8')

    expect(source).toContain('Operator Console')
    expect(source).toContain('v1 local governance workspace')
    expect(source).toContain('without hidden runtime authorization')
  })

  it('provides shared loading, empty, error, status, and safety UI states', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'components', 'operator-console', 'ui.tsx'), 'utf8')

    expect(source).toContain('LoadingState')
    expect(source).toContain('EmptyState')
    expect(source).toContain('ErrorState')
    expect(source).toContain('StatusBadge')
    expect(source).toContain('SafetyNote')
    for (const status of ['draft', 'review', 'approved_record', 'rejected', 'superseded', 'archived']) {
      expect(lifecycleStatuses).toContain(status)
      expect(source).toContain(status)
    }
  })

  it('removes mojibake from key frontend surfaces', () => {
    const files = [
      join(process.cwd(), 'README.md'),
      join(process.cwd(), 'src', 'app', 'operator', 'page.tsx'),
      join(process.cwd(), 'src', 'components', 'operator-console', 'operator-overview.tsx'),
      join(process.cwd(), 'src', 'components', 'operator-console', 'task-board.tsx'),
      join(process.cwd(), 'src', 'components', 'operator-console', 'agent-stats.tsx'),
      join(process.cwd(), 'src', 'components', 'operator-console', 'audit-timeline.tsx'),
      join(process.cwd(), 'src', 'components', 'operator-console', 'eval-panel.tsx'),
      join(process.cwd(), 'src', 'components', 'operator-console', 'multi-agent-flow.tsx'),
    ]

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      expect(source).not.toMatch(/[�鈥鏆鏉鍔]/)
    }
  })
})

describe('Sprint 18-21 Operator Console Safety', () => {
  it('exposes local department labels without forbidden runtime labels', () => {
    const source = readOperatorSource('department-panel.tsx')

    expect(source).toContain('View Department Profile')
    expect(source).toContain('View Department Agent Role')
    expect(source).toContain('View Responsibility Matrix')
    expect(source).toContain('View Department Permission Boundary')
    expect(source).toContain('Submit Department Review')
    expect(source).toContain('Approve Department Record')
    expect(source).toContain('Reject Department Record')
    expect(source).toContain('Archive Department Record')

    for (const label of forbiddenRuntimeLabels) {
      expect(source).not.toContain(label)
    }
  })

  it('exposes local mapping labels without forbidden runtime labels', () => {
    const source = readOperatorSource('department-evidence-map-panel.tsx')

    expect(source).toContain('View Department Evidence Map')
    expect(source).toContain('View Evidence Coverage')
    expect(source).toContain('View Department Review Gaps')
    expect(source).toContain('Submit Mapping Review')
    expect(source).toContain('Approve Mapping Record')
    expect(source).toContain('Reject Mapping Record')
    expect(source).toContain('Archive Mapping Record')
    expect(source).toContain('View Mapping Audit')
    expect(source).toContain('View Mapping Timeline')

    for (const label of forbiddenRuntimeLabels) {
      expect(source).not.toContain(label)
    }
  })

  it('exposes local execution gateway labels without forbidden runtime labels', () => {
    const source = readOperatorSource('execution-gateway-panel.tsx')

    expect(source).toContain('View Execution Intent')
    expect(source).toContain('View Execution Plan')
    expect(source).toContain('View Execution Gate')
    expect(source).toContain('View Execution Receipt')
    expect(source).toContain('Submit Execution Review')
    expect(source).toContain('Approve Execution Record')
    expect(source).toContain('Reject Execution Record')
    expect(source).toContain('Archive Execution Record')
    expect(source).toContain('View Execution Audit')
    expect(source).toContain('View Execution Timeline')

    for (const label of forbiddenRuntimeLabels) {
      expect(source).not.toContain(label)
    }
  })

  it('exposes local assignment labels without forbidden runtime labels', () => {
    const source = readOperatorSource('department-assignment-panel.tsx')

    expect(source).toContain('View Task Intake')
    expect(source).toContain('View Department Assignment Proposal')
    expect(source).toContain('View Role Fit Review')
    expect(source).toContain('Submit Assignment Review')
    expect(source).toContain('Approve Assignment Record')
    expect(source).toContain('Reject Assignment Record')
    expect(source).toContain('Archive Assignment Record')
    expect(source).toContain('View Assignment Audit')
    expect(source).toContain('View Assignment Timeline')

    for (const label of forbiddenRuntimeLabels) {
      expect(source).not.toContain(label)
    }
  })

  it('does not expose execute-approved console wiring', async () => {
    const index = await import('../index')
    const dir = join(process.cwd(), 'src', 'components', 'operator-console')
    const source = readdirSync(dir)
      .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'))
      .map((file) => readFileSync(join(dir, file), 'utf8'))
      .join('\n')

    expect('ExecutionPanel' in index).toBe(false)
    expect(source).not.toContain('/api/tool-runs/execute-approved')
    expect(source).not.toContain('ExecutionPanel')
  })
})
