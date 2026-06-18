import { describe, it, expect } from 'vitest'
import {
  validateSourceEvidenceRef,
  validateSourceEvidenceRefs,
  validateNoForbiddenStates,
  validateNoForbiddenActionTerms,
  validateApiRouteName,
  validateUiLabel,
  validateStepReferencesExist,
  validateNoExecutableNodes,
  validateGraphEdgeReferences,
  validateProposalSafetyFields,
  validateStepSafetyFields,
  validateReviewSafetyFields,
  validateReadinessSafetyFields,
  validateGraphSafetyFields,
  InvalidSourceEvidenceError,
  ForbiddenStateError,
  ForbiddenActionTermError,
  InvalidStepDependencyError,
  InvalidGraphError,
  SafetyViolationError,
} from '../validators'
import type { WorkflowSourceEvidenceRef, WorkflowGraphNode, WorkflowStepRecord } from '../types'

describe('Workflow Validators', () => {
  describe('validateSourceEvidenceRef', () => {
    it('accepts valid evidence ref', () => {
      const ref: WorkflowSourceEvidenceRef = {
        sourceType: 'task',
        sourceId: 'task-1',
        summary: 'Test task',
        redactionStatus: 'sanitized',
        isExecutionToken: false,
      }
      expect(() => validateSourceEvidenceRef(ref)).not.toThrow()
    })

    it('rejects unknown sourceType', () => {
      const ref = {
        sourceType: 'unknown_type',
        summary: 'Test',
        redactionStatus: 'sanitized',
        isExecutionToken: false,
      } as unknown as WorkflowSourceEvidenceRef
      expect(() => validateSourceEvidenceRef(ref)).toThrow(InvalidSourceEvidenceError)
    })

    it('rejects isExecutionToken: true', () => {
      const ref = {
        sourceType: 'task',
        summary: 'Test',
        redactionStatus: 'sanitized',
        isExecutionToken: true,
      } as unknown as WorkflowSourceEvidenceRef
      expect(() => validateSourceEvidenceRef(ref)).toThrow(InvalidSourceEvidenceError)
    })

    it('rejects invalid redactionStatus', () => {
      const ref = {
        sourceType: 'task',
        summary: 'Test',
        redactionStatus: 'invalid',
        isExecutionToken: false,
      } as unknown as WorkflowSourceEvidenceRef
      expect(() => validateSourceEvidenceRef(ref)).toThrow(InvalidSourceEvidenceError)
    })
  })

  describe('validateSourceEvidenceRefs', () => {
    it('accepts array of valid refs', () => {
      const refs: WorkflowSourceEvidenceRef[] = [
        { sourceType: 'task', summary: 'A', redactionStatus: 'sanitized', isExecutionToken: false },
        { sourceType: 'agent_run', summary: 'B', redactionStatus: 'redacted', isExecutionToken: false },
      ]
      expect(() => validateSourceEvidenceRefs(refs)).not.toThrow()
    })

    it('reports index on invalid ref', () => {
      const refs = [
        { sourceType: 'task', summary: 'A', redactionStatus: 'sanitized', isExecutionToken: false },
        { sourceType: 'bad', summary: 'B', redactionStatus: 'sanitized', isExecutionToken: false },
      ] as unknown as WorkflowSourceEvidenceRef[]
      expect(() => validateSourceEvidenceRefs(refs)).toThrow('refs[1]')
    })
  })

  describe('validateNoForbiddenStates', () => {
    it('rejects forbidden states', () => {
      expect(() => validateNoForbiddenStates(['running'])).toThrow(ForbiddenStateError)
      expect(() => validateNoForbiddenStates(['completed'])).toThrow(ForbiddenStateError)
      expect(() => validateNoForbiddenStates(['deployed'])).toThrow(ForbiddenStateError)
    })

    it('accepts valid states', () => {
      expect(() => validateNoForbiddenStates(['draft', 'review', 'approved_record'])).not.toThrow()
    })
  })

  describe('validateNoForbiddenActionTerms', () => {
    it('rejects forbidden terms', () => {
      expect(() => validateNoForbiddenActionTerms('Run Workflow', 'test')).toThrow(ForbiddenActionTermError)
      expect(() => validateNoForbiddenActionTerms('Execute Step', 'test')).toThrow(ForbiddenActionTermError)
      expect(() => validateNoForbiddenActionTerms('Continue Agent', 'test')).toThrow(ForbiddenActionTermError)
    })

    it('accepts allowed terms', () => {
      expect(() => validateNoForbiddenActionTerms('Approve Workflow Record', 'test')).not.toThrow()
      expect(() => validateNoForbiddenActionTerms('View Workflow Proposal', 'test')).not.toThrow()
    })
  })

  describe('validateApiRouteName', () => {
    it('rejects /run', () => {
      expect(() => validateApiRouteName('/api/workflow/run')).toThrow()
    })

    it('rejects /execute', () => {
      expect(() => validateApiRouteName('/api/workflow/execute')).toThrow()
    })

    it('accepts /approve-record', () => {
      expect(() => validateApiRouteName('/api/workflow-proposals/:id/approve-record')).not.toThrow()
    })
  })

  describe('validateUiLabel', () => {
    it('rejects Run Workflow', () => {
      expect(() => validateUiLabel('Run Workflow')).toThrow()
    })

    it('rejects Execute Step', () => {
      expect(() => validateUiLabel('Execute Step')).toThrow()
    })

    it('accepts Approve Workflow Record', () => {
      expect(() => validateUiLabel('Approve Workflow Record')).not.toThrow()
    })

    it('accepts View Workflow Proposal', () => {
      expect(() => validateUiLabel('View Workflow Proposal')).not.toThrow()
    })
  })

  describe('validateStepReferencesExist', () => {
    it('passes when all references exist', () => {
      const steps = [
        { id: 's1', dependsOnStepIds: [], blockedByStepIds: [] } as unknown as WorkflowStepRecord,
        { id: 's2', dependsOnStepIds: ['s1'], blockedByStepIds: [] } as unknown as WorkflowStepRecord,
      ]
      expect(() => validateStepReferencesExist(steps)).not.toThrow()
    })

    it('fails when dependsOn references non-existent step', () => {
      const steps = [
        { id: 's1', dependsOnStepIds: ['s99'], blockedByStepIds: [] } as unknown as WorkflowStepRecord,
      ]
      expect(() => validateStepReferencesExist(steps)).toThrow(InvalidStepDependencyError)
    })

    it('fails when blockedBy references non-existent step', () => {
      const steps = [
        { id: 's1', dependsOnStepIds: [], blockedByStepIds: ['s99'] } as unknown as WorkflowStepRecord,
      ]
      expect(() => validateStepReferencesExist(steps)).toThrow(InvalidStepDependencyError)
    })
  })

  describe('validateNoExecutableNodes', () => {
    it('passes when all nodes have canExecute: false', () => {
      const nodes: WorkflowGraphNode[] = [
        { id: 'n1', nodeType: 'workflow_step', label: 'Step 1', canExecute: false },
      ]
      expect(() => validateNoExecutableNodes(nodes)).not.toThrow()
    })

    it('fails when any node has canExecute: true', () => {
      const nodes = [
        { id: 'n1', nodeType: 'workflow_step', label: 'Step 1', canExecute: true },
      ] as unknown as WorkflowGraphNode[]
      expect(() => validateNoExecutableNodes(nodes)).toThrow(InvalidGraphError)
    })
  })

  describe('validateGraphEdgeReferences', () => {
    it('passes when all edges reference existing nodes', () => {
      const nodes: WorkflowGraphNode[] = [
        { id: 'n1', nodeType: 'workflow_step', label: 'A', canExecute: false },
        { id: 'n2', nodeType: 'workflow_step', label: 'B', canExecute: false },
      ]
      const edges = [{ fromNodeId: 'n1', toNodeId: 'n2' }]
      expect(() => validateGraphEdgeReferences(nodes, edges)).not.toThrow()
    })

    it('fails when edge references non-existent node', () => {
      const nodes: WorkflowGraphNode[] = [
        { id: 'n1', nodeType: 'workflow_step', label: 'A', canExecute: false },
      ]
      const edges = [{ fromNodeId: 'n1', toNodeId: 'n99' }]
      expect(() => validateGraphEdgeReferences(nodes, edges)).toThrow(InvalidGraphError)
    })
  })

  describe('safety field validators', () => {
    it('validateProposalSafetyFields passes', () => {
      expect(() => validateProposalSafetyFields({
        executionCapability: 'none',
        canExecute: false,
        requiresKelvinConfirmation: true,
      })).not.toThrow()
    })

    it('validateProposalSafetyFields fails on wrong canExecute', () => {
      expect(() => validateProposalSafetyFields({
        executionCapability: 'none',
        canExecute: true,
        requiresKelvinConfirmation: true,
      })).toThrow(SafetyViolationError)
    })

    it('validateStepSafetyFields passes', () => {
      expect(() => validateStepSafetyFields({
        executionCapability: 'none',
        canExecute: false,
      })).not.toThrow()
    })

    it('validateReviewSafetyFields passes', () => {
      expect(() => validateReviewSafetyFields({ doesNotExecute: true })).not.toThrow()
    })

    it('validateReviewSafetyFields fails on doesNotExecute: false', () => {
      expect(() => validateReviewSafetyFields({ doesNotExecute: false })).toThrow(SafetyViolationError)
    })

    it('validateReadinessSafetyFields passes', () => {
      expect(() => validateReadinessSafetyFields({ isExecutionToken: false })).not.toThrow()
    })

    it('validateReadinessSafetyFields fails on isExecutionToken: true', () => {
      expect(() => validateReadinessSafetyFields({ isExecutionToken: true })).toThrow(SafetyViolationError)
    })

    it('validateGraphSafetyFields passes', () => {
      expect(() => validateGraphSafetyFields({ containsExecutableNode: false })).not.toThrow()
    })

    it('validateGraphSafetyFields fails on containsExecutableNode: true', () => {
      expect(() => validateGraphSafetyFields({ containsExecutableNode: true })).toThrow(SafetyViolationError)
    })
  })
})
