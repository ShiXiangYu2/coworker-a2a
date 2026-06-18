/**
 * Operator Console 组件导出和类型测试
 */

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

describe('Operator Console Components', () => {
  it('TaskBoard should be a function component', () => {
    expect(typeof TaskBoard).toBe('function')
  })

  it('AgentStats should be a function component', () => {
    expect(typeof AgentStats).toBe('function')
  })

  it('AuditTimeline should be a function component', () => {
    expect(typeof AuditTimeline).toBe('function')
  })

  it('MultiAgentFlow should be a function component', () => {
    expect(typeof MultiAgentFlow).toBe('function')
  })

  it('EvalPanel should be a function component', () => {
    expect(typeof EvalPanel).toBe('function')
  })

  it('OperatorOverview should be a function component', () => {
    expect(typeof OperatorOverview).toBe('function')
  })

  it('ToolBoundaryPanel should be a read-only function component', () => {
    expect(typeof ToolBoundaryPanel).toBe('function')
  })

  it('DepartmentPanel should be a local record function component', () => {
    expect(typeof DepartmentPanel).toBe('function')
  })

  it('DepartmentEvidenceMapPanel should be a local mapping record function component', () => {
    expect(typeof DepartmentEvidenceMapPanel).toBe('function')
  })

  it('ExecutionGatewayPanel should be a local execution gateway record function component', () => {
    expect(typeof ExecutionGatewayPanel).toBe('function')
  })

  it('DepartmentAssignmentPanel should be a local assignment review function component', () => {
    expect(typeof DepartmentAssignmentPanel).toBe('function')
  })
})

describe('Operator Console Index', () => {
  it('should export all components', async () => {
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

describe('Sprint 21 Operator Console Department Assignment Safety', () => {
  it('exposes local assignment labels without forbidden runtime labels', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'components', 'operator-console', 'department-assignment-panel.tsx'), 'utf8')

    expect(source).toContain('View Task Intake')
    expect(source).toContain('View Department Assignment Proposal')
    expect(source).toContain('View Role Fit Review')
    expect(source).toContain('Submit Assignment Review')
    expect(source).toContain('Approve Assignment Record')
    expect(source).toContain('Reject Assignment Record')
    expect(source).toContain('Archive Assignment Record')
    expect(source).toContain('View Assignment Audit')
    expect(source).toContain('View Assignment Timeline')

    expect(source).not.toContain('Route Task')
    expect(source).not.toContain('Auto Route')
    expect(source).not.toContain('Assign Agent')
    expect(source).not.toContain('Assign Runtime Agent')
    expect(source).not.toContain('Start Agent')
    expect(source).not.toContain('Continue Agent')
    expect(source).not.toContain('Run Agent')
    expect(source).not.toContain('Run Tool')
    expect(source).not.toContain('Execute Workflow')
    expect(source).not.toContain('Grant Permission')
    expect(source).not.toContain('Request Permission')
    expect(source).not.toContain('Apply Change')
    expect(source).not.toContain('Write File')
    expect(source).not.toContain('Run Git')
    expect(source).not.toContain('Call API')
    expect(source).not.toContain('Connect MCP')
    expect(source).not.toContain('Create PR')
    expect(source).not.toContain('Deploy')
    expect(source).not.toContain('Publish')
    expect(source).not.toContain('Release')
    expect(source).not.toContain('Complete Task')
    expect(source).not.toContain('Retry')
    expect(source).not.toContain('Replay')
    expect(source).not.toContain('Rollback')
    expect(source).not.toContain('Restore')
    expect(source).not.toContain('Resume Execution')
  })
})

describe('Sprint 16 Operator Console Safety', () => {
  it('should not expose execution panel exports or execute-approved console wiring', async () => {
    const index = await import('../index')
    expect('ExecutionPanel' in index).toBe(false)
  })

  it('should avoid forbidden Sprint 16 execution-oriented UI wiring', () => {
    const dir = join(process.cwd(), 'src', 'components', 'operator-console')
    const source = readdirSync(dir)
      .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'))
      .map((file) => readFileSync(join(dir, file), 'utf8'))
      .join('\n')

    expect(source).not.toContain('/api/tool-runs/execute-approved')
    expect(source).not.toContain('ExecutionPanel')
    expect(source).not.toContain('Run Tool')
    expect(source).not.toContain('Execute')
    expect(source).not.toContain('Deploy')
    expect(source).not.toContain('Release')
    expect(source).not.toContain('Complete Task')
    expect(source).not.toContain('Resume Execution')
  })
})

describe('Sprint 19 Operator Console Department Evidence Mapping Safety', () => {
  it('exposes local mapping labels without forbidden runtime labels', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'components', 'operator-console', 'department-evidence-map-panel.tsx'), 'utf8')

    expect(source).toContain('View Department Evidence Map')
    expect(source).toContain('View Evidence Coverage')
    expect(source).toContain('View Department Review Gaps')
    expect(source).toContain('Submit Mapping Review')
    expect(source).toContain('Approve Mapping Record')
    expect(source).toContain('Reject Mapping Record')
    expect(source).toContain('Archive Mapping Record')
    expect(source).toContain('View Mapping Audit')
    expect(source).toContain('View Mapping Timeline')

    expect(source).not.toContain('Run Mapping')
    expect(source).not.toContain('Execute Mapping')
    expect(source).not.toContain('Auto Route')
    expect(source).not.toContain('Assign Agent')
    expect(source).not.toContain('Grant Permission')
    expect(source).not.toContain('Import Live')
    expect(source).not.toContain('Sync Evidence')
    expect(source).not.toContain('Run Agent')
    expect(source).not.toContain('Run Tool')
    expect(source).not.toContain('Execute Workflow')
    expect(source).not.toContain('Write File')
    expect(source).not.toContain('Run Git')
    expect(source).not.toContain('Call API')
    expect(source).not.toContain('Connect MCP')
    expect(source).not.toContain('Create PR')
    expect(source).not.toContain('Deploy')
    expect(source).not.toContain('Release')
    expect(source).not.toContain('Complete Task')
    expect(source).not.toContain('Retry')
    expect(source).not.toContain('Replay')
    expect(source).not.toContain('Rollback')
    expect(source).not.toContain('Restore')
    expect(source).not.toContain('Resume Execution')
  })

  it('does not introduce forbidden mapping API semantics', () => {
    const apiDir = join(process.cwd(), 'src', 'app', 'api')
    const apiFiles = readdirSync(apiDir, { recursive: true })
      .filter((file): file is string => typeof file === 'string' && file.endsWith('route.ts') && file.includes('department'))
      .map((file) => readFileSync(join(apiDir, file), 'utf8'))
      .join('\n')

    expect(apiFiles).not.toContain('execute-approved')
    expect(apiFiles).not.toContain('live-import')
    expect(apiFiles).not.toContain('sync-evidence')
    expect(apiFiles).not.toContain('agent-router')
    expect(apiFiles).not.toContain('runtime-permission')
  })
})

describe('Sprint 20 Operator Console Human-Gated Execution Safety', () => {
  it('exposes local execution gateway labels without forbidden runtime labels', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'components', 'operator-console', 'execution-gateway-panel.tsx'), 'utf8')

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

    expect(source).not.toContain('Run Execution')
    expect(source).not.toContain('Execute Now')
    expect(source).not.toContain('Continue Agent')
    expect(source).not.toContain('Auto Route')
    expect(source).not.toContain('Assign Agent')
    expect(source).not.toContain('Run Tool')
    expect(source).not.toContain('Execute Workflow')
    expect(source).not.toContain('Apply Change')
    expect(source).not.toContain('Write File')
    expect(source).not.toContain('Run Git')
    expect(source).not.toContain('Call API')
    expect(source).not.toContain('Connect MCP')
    expect(source).not.toContain('Create PR')
    expect(source).not.toContain('Deploy')
    expect(source).not.toContain('Release')
    expect(source).not.toContain('Complete Task')
    expect(source).not.toContain('Retry')
    expect(source).not.toContain('Replay')
    expect(source).not.toContain('Rollback')
    expect(source).not.toContain('Resume Execution')
  })

  it('does not introduce forbidden execution gateway API semantics', () => {
    const apiDir = join(process.cwd(), 'src', 'app', 'api')
    const apiFiles = readdirSync(apiDir, { recursive: true })
      .filter((file): file is string => typeof file === 'string' && file.endsWith('route.ts') && file.includes('execution'))
      .map((file) => readFileSync(join(apiDir, file), 'utf8'))
      .join('\n')

    expect(apiFiles).not.toContain('execute-approved')
    expect(apiFiles).not.toContain('live-execution')
    expect(apiFiles).not.toContain('agent-router')
    expect(apiFiles).not.toContain('runtime-permission')
    expect(apiFiles).not.toContain('complete-task')
  })
})

describe('Sprint 18 Operator Console Department Safety', () => {
  it('exposes local department labels without forbidden runtime labels', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'components', 'operator-console', 'department-panel.tsx'), 'utf8')

    expect(source).toContain('View Department Profile')
    expect(source).toContain('View Department Agent Role')
    expect(source).toContain('View Responsibility Matrix')
    expect(source).toContain('View Department Permission Boundary')
    expect(source).toContain('Submit Department Review')
    expect(source).toContain('Approve Department Record')
    expect(source).toContain('Reject Department Record')
    expect(source).toContain('Archive Department Record')

    expect(source).not.toContain('Run Department')
    expect(source).not.toContain('Execute Department')
    expect(source).not.toContain('Assign Automatically')
    expect(source).not.toContain('Auto Route')
    expect(source).not.toContain('Delegate Now')
    expect(source).not.toContain('Continue Agent')
    expect(source).not.toContain('Run Agent')
    expect(source).not.toContain('Run Tool')
    expect(source).not.toContain('Execute Tool')
    expect(source).not.toContain('Execute Workflow')
    expect(source).not.toContain('Apply Change')
    expect(source).not.toContain('Write File')
    expect(source).not.toContain('Run Git')
    expect(source).not.toContain('Call API')
    expect(source).not.toContain('Connect MCP')
    expect(source).not.toContain('Create PR')
    expect(source).not.toContain('Deploy')
    expect(source).not.toContain('Publish')
    expect(source).not.toContain('Release')
    expect(source).not.toContain('Complete Task')
    expect(source).not.toContain('Retry')
    expect(source).not.toContain('Replay')
    expect(source).not.toContain('Rollback')
    expect(source).not.toContain('Restore')
    expect(source).not.toContain('Resume Execution')
  })
})
