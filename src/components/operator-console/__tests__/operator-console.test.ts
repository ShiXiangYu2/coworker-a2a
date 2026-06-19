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
import { RuntimeExecutionPanel } from '../runtime-execution-panel'
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
    expect(typeof RuntimeExecutionPanel).toBe('function')
  })
})

describe('Operator Console Index', () => {
  it('exports all console panels without exposing an unrestricted execution panel', async () => {
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
    expect(index.RuntimeExecutionPanel).toBeDefined()
    expect('ExecutionPanel' in index).toBe(false)
  })
})

describe('v1 frontend closure polish', () => {
  it('keeps Sprint 17-21 console entrypoints visible in the operator page', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'operator', 'page.tsx'), 'utf8')

    expect(source).toContain('Operator Console')
    expect(source).toContain('证据沙箱')
    expect(source).toContain('部门画像')
    expect(source).toContain('证据映射')
    expect(source).toContain('Execution Gateway')
    expect(source).toContain('分配复核')
    expect(source).toContain('本地记录 / 人工门控 / 证据优先 / 建议只读')
    expect(source).toContain('总览 Overview')
    expect(source).toContain('任务流 Task Flow')
    expect(source).toContain('运行态 Runtime')
    expect(source).toContain('治理账本 Governance Ledger')
    expect(source).toContain('DepartmentEvidenceMapPanel')
    expect(source).toContain('ExecutionGatewayPanel')
    expect(source).toContain('DepartmentAssignmentPanel')
    expect(source).toContain('RuntimeExecutionPanel')
    expect(source).toContain('runtimeTaskId')
    expect(source).toContain('searchParams')
  })

  it('keeps ChatHub linked to the Operator Console with v1 local governance copy', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'page.tsx'), 'utf8')

    expect(source).toContain('Operator Console')
    expect(source).toContain('v1 本地治理闭环')
    expect(source).toContain('ChatHub 用来接收需求')
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

  it('loads OperatorOverview from the structured overview API without mutation controls', () => {
    const source = readOperatorSource('operator-overview.tsx')

    expect(source).toContain('/api/operator/overview?limit=5')
    expect(source).toContain('OperatorOverviewReadModel')
    expect(source).toContain('Active Runtime')
    expect(source).toContain('Blocked Summary')
    expect(source).toContain('Recent Receipts')
    expect(source).toContain('只读派生视图')
    expect(source).toContain('查看任务流')
    expect(source).toContain('查看运行态')
    expect(source).toContain('navigation.taskFlowHref')
    expect(source).toContain('navigation.runtimeHref')
    expect(source).not.toContain('/api/conversations')
    expect(source).not.toContain('/api/harmony/tasks')
    expect(source).not.toContain('/api/audit/agent-runs')
    expect(source).not.toContain('/api/tool-calls')
    expect(source).not.toContain('/api/eval-runs')
    expect(source).not.toContain('/api/workflow-proposals')
    expect(source).not.toContain('<button')
    expect(source).not.toContain('/claim')
    expect(source).not.toContain('/run-once')
    expect(source).not.toContain('/complete')
    expect(source).not.toContain('/retry')
    expect(source).not.toContain('/approve')
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
    expect(source).toContain('/api/agent-task-runs?correlationId=')
    expect(source).toContain('/api/runtime-executions?correlationId=')
    expect(source).toContain('/api/runs?limit=5')
    expect(source).toContain('/api/runs/${encodeURIComponent(correlationId)}')
    expect(source).toContain('Recent Runs')
    expect(source).toContain('Source:')
    expect(source).toContain('Request status:')
    expect(source).toContain('No request summary.')
    expect(source).toContain('View Replay')
    expect(source).toContain('Read-only Replay')
    expect(source).toContain('Replay Timeline')
    expect(source).toContain('Failure Drill-down')
    expect(source).toContain('Read-only Failure Review')

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

  it('adds a read-only TaskBoard link to the runtime execution view', () => {
    const source = readOperatorSource('task-board.tsx')

    expect(source).toContain('/operator?runtimeTaskId=')
    expect(source).toContain('View Runtime Status')
    expect(source).not.toContain('Run Runtime')
    expect(source).not.toContain('Claim Runtime')
    expect(source).not.toContain('Start Runtime')
    expect(source).not.toContain('Complete Runtime')
    expect(source).not.toContain('Execute Runtime')
    expect(source).not.toContain('Obsidian Write')
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
    expect(source).not.toContain('export { ExecutionPanel')
  })

  it('adds a Sprint 22 runtime execution panel as read-only UI only', () => {
    const source = readOperatorSource('runtime-execution-panel.tsx')

    expect(source).toContain('RuntimeExecutionPanel')
    expect(source).toContain('taskId')
    expect(source).toContain('/api/tasks/${encodeURIComponent(taskIdForRequest)}/runtime-operator-view')
    expect(source).toContain('EmptyState')
    expect(source).toContain('LoadingState')
    expect(source).toContain('ErrorState')
    expect(source).toContain('primaryStatus')
    expect(source).toContain('latestReceipt')
    expect(source).toContain('RuntimeExecutionHighlightedSection')
    expect(source).toContain('highlightedSection')
    expect(source).toContain('summary')
    expect(source).toContain('latest-receipt')
    expect(source).toContain('blocked-signal')
    expect(source).toContain('当前定位到运行态摘要区块')
    expect(source).toContain('当前定位到最新 receipt 区块')
    expect(source).toContain('当前定位到 blocked signal 区块')
    expect(source).toContain('data.lifecycle.phase')
    expect(source).toContain('summary.counts')
    expect(source).toContain('summary.receipts')
    expect(source).toContain('statusBands.live')
    expect(source).toContain('statusBands.succeeded')
    expect(source).toContain('statusBands.blocked')
    expect(source).toContain('statusBands.failed')
    expect(source).toContain('SafetyNote')
    expect(source).not.toContain('<button')
    expect(source).not.toContain('run-once')
    expect(source).not.toContain('complete-dry-run')
    expect(source).not.toContain('complete-obsidian-write')
    expect(source).not.toContain('claimRuntime')
    expect(source).not.toContain('startRuntime')
  })

  it('loads MultiAgentFlow from the structured task flow API without assistant text parsing', () => {
    const source = readOperatorSource('multi-agent-flow.tsx')

    expect(source).toContain('/api/operator/task-flows?limit=5')
    expect(source).toContain('OperatorTaskFlowReadModel')
    expect(source).toContain('TaskFlowNodeCard')
    expect(source).toContain('本视图只读')
    expect(source).toContain('highlightedTaskId')
    expect(source).toContain('highlightedNodeId')
    expect(source).toContain('当前定位任务')
    expect(source).toContain('当前定位节点')
    expect(source).toContain('任务流定位')
    expect(source).toContain('运行态视图')
    expect(source).toContain('查看运行态区块')
    expect(source).toContain('flow.navigation.taskFlowHref')
    expect(source).toContain('flow.navigation.runtimeHref')
    expect(source).not.toContain('/api/conversations')
    expect(source).not.toContain('extractSteps')
    expect(source).not.toContain('assistant')
    expect(source).not.toContain('<button')
    expect(source).not.toContain('/claim')
    expect(source).not.toContain('/retry')
    expect(source).not.toContain('/approve')
    expect(source).not.toContain('/complete')
    expect(source).not.toContain('onClick={() => void fetchTaskFlows()')
  })

  it('wires the runtime execution panel into the operator page through runtimeTaskId only', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'app', 'operator', 'page.tsx'), 'utf8')

    expect(source).toContain('RuntimeExecutionPanel')
    expect(source).toContain('runtimeTaskId')
    expect(source).toContain('taskFlowTaskId')
    expect(source).toContain('taskFlowNodeId')
    expect(source).toContain('runtimeSection')
    expect(source).toContain('runtimeSectionParam')
    expect(source).toContain('searchParams')
    expect(source).toContain('taskId={runtimeTaskId}')
    expect(source).toContain('highlightedTaskId={taskFlowTaskId}')
    expect(source).toContain('highlightedNodeId={taskFlowNodeId}')
    expect(source).toContain('highlightedSection={runtimeSection}')
    expect(source).not.toContain('/api/runtime/jobs/claim')
    expect(source).not.toContain('/complete-dry-run')
    expect(source).not.toContain('/complete-obsidian-write')
    expect(source).not.toContain('/run-once')
  })
})
