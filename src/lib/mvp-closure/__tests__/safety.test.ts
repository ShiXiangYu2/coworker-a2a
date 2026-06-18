import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('Sprint 15 MVP closure safety', () => {
  it('adds only allowed Sprint 15 local record models', () => {
    const schema = read('prisma/schema.prisma')

    expect(schema).toContain('model MVPReadinessRecord')
    expect(schema).toContain('model DemoScenarioRecord')
    expect(schema).toContain('model GovernanceSummaryRecord')
    expect(schema).toContain('model MVPReviewRecord')

    for (const model of [
      'MVPExecution',
      'ReleaseRun',
      'DeployRun',
      'PublishRun',
      'WorkflowRun',
      'WorkflowExecution',
      'WorkflowStepExecution',
      'AgentContinuationRun',
      'ToolRunExecution',
      'FileWrite',
      'FilePatchApply',
      'GitOperation',
      'PullRequestRun',
      'ExternalApiCall',
      'McpSession',
      'WebhookDispatch',
      'Worker',
      'Queue',
      'AutoFix',
      'AutoRemediation',
      'RetryJob',
      'ReplayJob',
      'RollbackJob',
      'ResumeExecutionJob',
    ]) {
      expect(schema).not.toMatch(new RegExp(`model\\s+${model}\\b`))
    }
  })

  it('keeps MVP APIs local-record-only without execution semantics', () => {
    const routeFiles = [
      'src/app/api/mvp-readiness-records/route.ts',
      'src/app/api/mvp-readiness-records/[id]/approve-record/route.ts',
      'src/app/api/demo-scenario-records/route.ts',
      'src/app/api/governance-summary-records/route.ts',
      'src/app/api/mvp-review-records/route.ts',
      'src/app/api/mvp-readiness-records/_shared.ts',
    ]
    const source = routeFiles.map(read).join('\n')

    for (const forbidden of [
      'executeApproved',
      'approveExecution',
      'requestPermission',
      'continueAgent',
      'resumeAgent',
      'prisma.agentRun.create',
      'prisma.agentRun.update',
      'prisma.toolRun.update',
      'prisma.harmonyTask.update',
      'deployRun',
      'publishRun',
      'releaseRun',
      'createDeploy',
      'createPublish',
      'createRelease',
      'rollback',
      'resumeExecution',
    ]) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('does not expose forbidden Sprint 15 UI labels', () => {
    const ui = read('src/components/chat/mvp-closure-card.tsx')
    for (const label of [
      'Execute',
      'Run',
      'Deploy',
      'Publish',
      'Release',
      'Auto Fix',
      'Auto Remediate',
      'Complete Task',
      'Continue Agent',
      'Run Tool',
      'Apply Change',
      'Write File',
      'Run Git',
      'Call API',
      'Connect MCP',
      'Create PR',
      'Retry',
      'Replay',
      'Rollback',
      'Resume Execution',
    ]) {
      expect(ui).not.toContain(label)
    }
  })

  it('documents Eval, RegressionGate, and ReleaseReadiness as evidence only', () => {
    const evalRun = read('specs/contracts/eval-run.md')
    const regressionGate = read('specs/contracts/regression-gate.md')
    const releaseReadiness = read('specs/contracts/release-readiness-checklist.md')

    expect(evalRun).toContain('EvalRun results are evidence only')
    expect(regressionGate).toContain('Sprint 15 MVP Closure Regression Boundary')
    expect(regressionGate).toContain('not an execution, release, deploy, publish, or Task completion token')
    expect(releaseReadiness).toContain('Sprint 15 MVP Closure Readiness Boundary')
    expect(releaseReadiness).toContain('not an execution, release, deploy, publish, or Task completion token')
  })
})
