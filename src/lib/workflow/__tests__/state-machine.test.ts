import { describe, it, expect } from 'vitest'
import {
  transitionWorkflow,
  canTransitionWorkflow,
  transitionWorkflowReview,
  InvalidWorkflowTransitionError,
  ForbiddenWorkflowStateError,
  assertNotForbidden,
} from '../state-machine'
import type { WorkflowStatus } from '../types'

describe('Workflow State Machine', () => {
  describe('transitionWorkflow', () => {
    it('transitions proposal -> draft', () => {
      expect(transitionWorkflow('proposal', 'DRAFT')).toBe('draft')
    })

    it('transitions proposal -> archived', () => {
      expect(transitionWorkflow('proposal', 'ARCHIVE')).toBe('archived')
    })

    it('transitions draft -> review', () => {
      expect(transitionWorkflow('draft', 'SUBMIT_REVIEW')).toBe('review')
    })

    it('transitions review -> approved_record', () => {
      expect(transitionWorkflow('review', 'APPROVE_RECORD')).toBe('approved_record')
    })

    it('transitions review -> rejected', () => {
      expect(transitionWorkflow('review', 'REJECT')).toBe('rejected')
    })

    it('transitions approved_record -> archived', () => {
      expect(transitionWorkflow('approved_record', 'ARCHIVE')).toBe('archived')
    })

    it('defaults to proposal when currentStatus is undefined', () => {
      expect(transitionWorkflow(undefined, 'DRAFT')).toBe('draft')
    })

    it('throws InvalidWorkflowTransitionError for invalid transition', () => {
      expect(() => transitionWorkflow('proposal', 'APPROVE_RECORD')).toThrow(InvalidWorkflowTransitionError)
    })

    it('throws InvalidWorkflowTransitionError for proposal -> review (must go through draft)', () => {
      expect(() => transitionWorkflow('proposal', 'SUBMIT_REVIEW')).toThrow(InvalidWorkflowTransitionError)
    })
  })

  describe('canTransitionWorkflow', () => {
    it('returns true for valid transition', () => {
      expect(canTransitionWorkflow('proposal', 'DRAFT')).toBe(true)
    })

    it('returns false for invalid transition', () => {
      expect(canTransitionWorkflow('proposal', 'APPROVE_RECORD')).toBe(false)
    })
  })

  describe('transitionWorkflowReview', () => {
    it('transitions draft -> review', () => {
      expect(transitionWorkflowReview('draft', 'SUBMIT_REVIEW')).toBe('review')
    })

    it('transitions review -> approved_record', () => {
      expect(transitionWorkflowReview('review', 'APPROVE_RECORD')).toBe('approved_record')
    })

    it('transitions review -> rejected', () => {
      expect(transitionWorkflowReview('review', 'REJECT')).toBe('rejected')
    })

    it('defaults to draft when currentStatus is undefined', () => {
      expect(transitionWorkflowReview(undefined, 'SUBMIT_REVIEW')).toBe('review')
    })
  })

  describe('forbidden states', () => {
    const forbiddenStates = [
      'running', 'executed', 'step_executed', 'continued', 'completed',
      'retried', 'replayed', 'rolled_back', 'resumed', 'applied',
      'called', 'connected', 'deployed',
    ]

    for (const state of forbiddenStates) {
      it(`rejects forbidden state "${state}"`, () => {
        expect(() => assertNotForbidden(state)).toThrow(ForbiddenWorkflowStateError)
      })
    }

    it('allows valid states', () => {
      const validStates: WorkflowStatus[] = [
        'proposal', 'draft', 'review', 'approved_record',
        'rejected', 'superseded', 'archived',
      ]
      for (const state of validStates) {
        expect(() => assertNotForbidden(state)).not.toThrow()
      }
    })
  })
})
