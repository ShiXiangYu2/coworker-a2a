import { describe, expectTypeOf, it } from 'vitest'
import type {
  RuntimeDispatchJobTimelineReadModel,
  TaskRuntimeExecutionSummaryReadModel,
} from '../read-models'
import { getTaskRuntimeExecutionSummary } from '../task-summary'
import { getRuntimeDispatchJobTimeline } from '../timeline'

describe('Sprint 22 runtime read model contracts', () => {
  it('keeps timeline read model aligned with timeline helper', () => {
    expectTypeOf<Awaited<ReturnType<typeof getRuntimeDispatchJobTimeline>>>()
      .toEqualTypeOf<RuntimeDispatchJobTimelineReadModel>()
  })

  it('keeps task summary read model aligned with task summary helper', () => {
    expectTypeOf<Awaited<ReturnType<typeof getTaskRuntimeExecutionSummary>>>()
      .toEqualTypeOf<TaskRuntimeExecutionSummaryReadModel>()
  })
})
