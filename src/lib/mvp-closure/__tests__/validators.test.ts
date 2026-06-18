import { describe, expect, it } from 'vitest'
import {
  validateBaselineSprints,
  validateDemoScenarioSafety,
  validateGovernanceSummarySafety,
  validateMVPAllowedUiLabel,
  validateMVPApiRouteName,
  validateMVPReadinessSafety,
  validateMVPReviewSafety,
  validateMVPSourceEvidenceRef,
  validateNoForbiddenMVPActionTerms,
  validateTokenBlocker,
} from '../validators'
import { REQUIRED_MVP_BASELINE_SPRINTS } from '../types'

const evidence = {
  sourceType: 'tool_execution_receipt' as const,
  sourceId: 'receipt-1',
  summary: 'Sanitized local receipt evidence only.',
  redactionStatus: 'sanitized' as const,
  isExecutionToken: false as const,
  isReleaseToken: false as const,
  isDeployToken: false as const,
}

describe('Sprint 15 MVP closure validators', () => {
  it('accepts sanitized evidence only', () => {
    expect(() => validateMVPSourceEvidenceRef(evidence)).not.toThrow()
    expect(() => validateMVPSourceEvidenceRef({ ...evidence, isExecutionToken: true as unknown as false })).toThrow()
    expect(() => validateMVPSourceEvidenceRef({ ...evidence, isReleaseToken: true as unknown as false })).toThrow()
    expect(() => validateMVPSourceEvidenceRef({ ...evidence, isDeployToken: true as unknown as false })).toThrow()
  })

  it('requires Sprint 1-14 baseline', () => {
    expect(() => validateBaselineSprints(REQUIRED_MVP_BASELINE_SPRINTS)).not.toThrow()
    expect(() => validateBaselineSprints(['sprint_14'])).toThrow()
  })

  it('blocks execution, release, and deploy token flags', () => {
    expect(() => validateTokenBlocker({
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
    })).not.toThrow()
    expect(() => validateTokenBlocker({
      isExecutionToken: false,
      isReleaseToken: true,
      isDeployToken: false,
    })).toThrow()
  })

  it('validates MVPReadinessRecord safety fields', () => {
    expect(() => validateMVPReadinessSafety({
      targetSprint: 'sprint_15',
      baselineSprints: [...REQUIRED_MVP_BASELINE_SPRINTS],
      evidenceRefs: [evidence],
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
      requiresKelvinConfirmation: true,
    })).not.toThrow()
  })

  it('validates DemoScenarioRecord cannot execute demo steps', () => {
    expect(() => validateDemoScenarioSafety({
      targetSprint: 'sprint_15',
      baselineSprints: [...REQUIRED_MVP_BASELINE_SPRINTS],
      orderedEvidenceRefs: [{
        sourceType: 'workflow_proposal',
        sourceId: 'wf-1',
        displayLabel: 'Workflow Proposal',
        summary: 'Local record only.',
        redactionStatus: 'sanitized',
        isExecutionToken: false,
      }],
      forbiddenRuntimeActions: [],
      demoScriptMarkdown: 'View local MVP readiness evidence.',
      canExecute: false,
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
    })).not.toThrow()

    expect(() => validateDemoScenarioSafety({
      targetSprint: 'sprint_15',
      baselineSprints: [...REQUIRED_MVP_BASELINE_SPRINTS],
      orderedEvidenceRefs: [],
      forbiddenRuntimeActions: [],
      demoScriptMarkdown: 'Deploy the MVP.',
      canExecute: false,
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
    })).toThrow()
  })

  it('validates GovernanceSummaryRecord cannot grant permission', () => {
    expect(() => validateGovernanceSummarySafety({
      targetSprint: 'sprint_15',
      coveredSprints: [...REQUIRED_MVP_BASELINE_SPRINTS],
      isExecutionToken: false,
      isReleaseToken: false,
      isDeployToken: false,
    })).not.toThrow()
  })

  it('validates MVPReviewRecord approval changes local status only', () => {
    expect(() => validateMVPReviewSafety({
      targetSprint: 'sprint_15',
      doesNotExecute: true,
      doesNotRelease: true,
      doesNotDeploy: true,
      doesNotCompleteTask: true,
    })).not.toThrow()
    expect(() => validateMVPReviewSafety({
      targetSprint: 'sprint_15',
      doesNotExecute: true,
      doesNotRelease: true,
      doesNotDeploy: true,
      doesNotCompleteTask: false,
    })).toThrow()
  })

  it('rejects forbidden API and UI action terms', () => {
    expect(() => validateMVPApiRouteName('/api/mvp-readiness-records')).not.toThrow()
    expect(() => validateMVPAllowedUiLabel('Create MVP Readiness Record')).not.toThrow()
    expect(() => validateNoForbiddenMVPActionTerms('Execute', 'UI label')).toThrow()
    expect(() => validateNoForbiddenMVPActionTerms('/api/mvp-readiness-records/deploy', 'API route')).toThrow()
  })
})
