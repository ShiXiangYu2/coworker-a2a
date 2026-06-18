import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Sprint 14 workflow orchestration safety', () => {
  it('does not introduce forbidden workflow execution models', () => {
    const schema = read('prisma/schema.prisma')
    expect(schema).toContain('model WorkflowProposal')
    expect(schema).toContain('model WorkflowStepRecord')
    expect(schema).toContain('model WorkflowDependencyGraph')
    expect(schema).toContain('model WorkflowReviewRecord')
    expect(schema).toContain('model WorkflowReadinessAssessment')

    for (const model of [
      'WorkflowRun',
      'WorkflowExecution',
      'WorkflowStepExecution',
      'AgentContinuationRun',
      'ToolRunExecution',
      'FileApplyRun',
      'DeployRun',
      'RetryJob',
      'ReplayJob',
      'RollbackJob',
      'ResumeExecutionJob',
    ]) {
      expect(schema).not.toMatch(new RegExp(`model\\s+${model}\\b`))
    }
  })

  it('keeps from-tool-run and from-agent-run routes read-and-snapshot only', () => {
    const fromToolRun = read('src/app/api/workflow-proposals/from-tool-run/route.ts')
    const fromAgentRun = read('src/app/api/workflow-proposals/from-agent-run/route.ts')

    expect(fromToolRun).toContain('findUnique')
    expect(fromToolRun).not.toContain('executeApproved')
    expect(fromToolRun).not.toContain('approveExecution')
    expect(fromToolRun).not.toContain('requestPermission')
    expect(fromToolRun).not.toContain('prisma.toolRun.update')

    expect(fromAgentRun).toContain('findUnique')
    expect(fromAgentRun).not.toContain('continueAgent')
    expect(fromAgentRun).not.toContain('resumeAgent')
    expect(fromAgentRun).not.toContain('prisma.agentRun.create')
    expect(fromAgentRun).not.toContain('prisma.agentRun.update')
  })

  it('does not expose forbidden Sprint 14 UI labels', () => {
    const ui = read('src/components/chat/workflow-proposal-card.tsx')
    for (const label of [
      'Run Workflow',
      'Execute Workflow',
      'Execute Step',
      'Continue Agent',
      'Run Tool',
      'Apply Change',
      'Write File',
      'Run Git',
      'Call API',
      'Connect MCP',
      'Create PR',
      'Deploy',
      'Complete Task',
      'Retry',
      'Replay',
      'Rollback',
      'Resume Execution',
    ]) {
      expect(ui).not.toContain(label)
    }
  })
})
