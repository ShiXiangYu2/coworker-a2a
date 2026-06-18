import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS,
  DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS,
  SPRINT_21_SAFETY_NOTE,
} from '../types'

describe('Sprint 21 department assignment repository contract', () => {
  it('keeps Sprint 21 records on consistent local lifecycle metadata', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
    for (const model of [
      'DepartmentTaskIntakeRecord',
      'DepartmentAssignmentProposal',
      'DepartmentRoleFitReview',
      'DepartmentAssignmentApprovalRecord',
      'DepartmentAssignmentAuditRecord',
    ]) {
      const start = schema.indexOf(`model ${model}`)
      const end = schema.indexOf('@@map', start)
      const block = schema.slice(start, end)
      for (const field of ['createdBy', 'reviewedBy', 'reviewedAt', 'archivedAt', 'supersedesRecordId', 'supersededByRecordId', 'supersededAt', 'supersedeReason', 'correlationId', 'createdAt', 'updatedAt']) {
        expect(block).toContain(field)
      }
    }
  })

  it('uses Sprint 1-20 records as local review references only', () => {
    expect(SPRINT_21_SAFETY_NOTE).toContain('local governance records only')
    expect(SPRINT_21_SAFETY_NOTE).toContain('does not route tasks')
    expect(SPRINT_21_SAFETY_NOTE).toContain('assign runtime agents')
    expect(SPRINT_21_SAFETY_NOTE).toContain('complete tasks')
  })

  it('all local records share token and runtime blockers', () => {
    expect(DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS.isTaskCompletionToken).toBe(false)
    expect(DEPARTMENT_ASSIGNMENT_TOKEN_BLOCKERS.grantsRuntimePermission).toBe(false)
    expect(DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS.routesTask).toBe(false)
    expect(DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS.autoRoutesTask).toBe(false)
    expect(DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS.assignsRuntimeAgent).toBe(false)
    expect(DEPARTMENT_ASSIGNMENT_RUNTIME_BLOCKERS.startsAgentRun).toBe(false)
  })
})
