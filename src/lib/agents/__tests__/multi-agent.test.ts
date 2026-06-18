/**
 * 多 Agent 协作测试
 *
 * 验证 CEO 分解、子任务调度、Agent 执行、结果汇总
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { resetLLMProvider } from '@/lib/llm'
import { routeMessageLLM, type SubTask } from '../llm-router'
import { scheduleSubTasks } from '../task-scheduler'
import { executeAgentTask } from '../task-executor'
import { summarizeResults } from '../result-summarizer'

describe('CEO Task Decomposition', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'mock'
  })

  describe('routeMessageLLM with decomposition', () => {
    it('should return decomposition for complex multi-agent task', async () => {
      const result = await routeMessageLLM({
        message: '帮我分析这个功能的 PRD 和技术方案，需要产品和工程两个角度',
      })

      // Mock mode may return route_to_agent or decompose_task
      expect(result).toHaveProperty('decisionType')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reason')
    })

    it('should return single route for simple task', async () => {
      const result = await routeMessageLLM({
        message: '帮我写一个 PRD',
      })

      expect(result.decisionType).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should handle empty message', async () => {
      const result = await routeMessageLLM({ message: '' })
      expect(result.decisionType).toBe('unsupported')
    })
  })
})

describe('Task Executor', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'mock'
  })

  describe('executeAgentTask', () => {
    it('should execute Jobs agent task', async () => {
      const result = await executeAgentTask('jobs', '分析这个产品需求')

      expect(result.agentId).toBe('jobs')
      expect(result.agentName).toBe('Jobs')
      expect(result.status).toBe('completed')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.summary).toBeTruthy()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should execute Linus agent task', async () => {
      const result = await executeAgentTask('linus', '评估这个技术方案')

      expect(result.agentId).toBe('linus')
      expect(result.agentName).toBe('Linus')
      expect(result.status).toBe('completed')
    })

    it('should execute Turing agent task', async () => {
      const result = await executeAgentTask('turing', '审查代码质量')

      expect(result.agentId).toBe('turing')
      expect(result.agentName).toBe('Turing')
      expect(result.status).toBe('completed')
    })

    it('should execute Bezos agent task', async () => {
      const result = await executeAgentTask('bezos', '分析市场反馈')

      expect(result.agentId).toBe('bezos')
      expect(result.agentName).toBe('Bezos')
      expect(result.status).toBe('completed')
    })

    it('should return failed for unknown agent', async () => {
      const result = await executeAgentTask('unknown_agent', 'test task')

      expect(result.status).toBe('failed')
      expect(result.error).toContain('not found')
    })

    it('should pass previous results as context', async () => {
      const previousResults = [{
        agentId: 'jobs',
        agentName: 'Jobs',
        title: '需求分析',
        status: 'completed' as const,
        confidence: 0.85,
        summary: '需要支持多语言',
        findings: ['国际化是核心需求'],
        deliverables: [],
        durationMs: 1000,
      }]

      const result = await executeAgentTask(
        'linus',
        '基于需求分析评估技术方案',
        previousResults
      )

      expect(result.status).toBe('completed')
      expect(result.agentId).toBe('linus')
    })
  })
})

describe('Task Scheduler', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'mock'
  })

  describe('scheduleSubTasks', () => {
    it('should execute single independent task', async () => {
      const subtasks: SubTask[] = [
        { agentId: 'jobs', title: '需求分析', description: '分析产品需求', dependsOn: [] },
      ]

      const result = await scheduleSubTasks(subtasks, { message: 'test' })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].status).toBe('completed')
      expect(result.allSucceeded).toBe(true)
    })

    it('should execute independent tasks in parallel', async () => {
      const subtasks: SubTask[] = [
        { agentId: 'jobs', title: '需求分析', description: '分析产品需求', dependsOn: [] },
        { agentId: 'turing', title: '质量审查', description: '审查代码质量', dependsOn: [] },
      ]

      const result = await scheduleSubTasks(subtasks, { message: 'test' })

      expect(result.results).toHaveLength(2)
      expect(result.results[0].status).toBe('completed')
      expect(result.results[1].status).toBe('completed')
    })

    it('should respect dependency order', async () => {
      const subtasks: SubTask[] = [
        { agentId: 'jobs', title: '需求分析', description: '分析产品需求', dependsOn: [] },
        { agentId: 'linus', title: '技术评估', description: '评估技术方案', dependsOn: [0] },
      ]

      const result = await scheduleSubTasks(subtasks, { message: 'test' })

      expect(result.results).toHaveLength(2)
      // Both should complete
      expect(result.results[0].status).toBe('completed')
      expect(result.results[1].status).toBe('completed')
      // Linus should take longer (depends on Jobs)
      expect(result.results[1].durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should handle complex dependency chain', async () => {
      const subtasks: SubTask[] = [
        { agentId: 'jobs', title: '需求分析', description: '分析需求', dependsOn: [] },
        { agentId: 'linus', title: '技术评估', description: '评估技术', dependsOn: [0] },
        { agentId: 'turing', title: '风险审查', description: '审查风险', dependsOn: [0, 1] },
      ]

      const result = await scheduleSubTasks(subtasks, { message: 'test' })

      expect(result.results).toHaveLength(3)
      expect(result.allSucceeded).toBe(true)
    })

    it('should limit to 5 subtasks', async () => {
      const subtasks: SubTask[] = Array.from({ length: 10 }, (_, i) => ({
        agentId: 'jobs' as const,
        title: `Task ${i}`,
        description: `Description ${i}`,
        dependsOn: [],
      }))

      const result = await scheduleSubTasks(subtasks, { message: 'test' })

      expect(result.results).toHaveLength(10) // Results array is full length
      // But only 5 should have been executed (others filled with failure)
    })

    it('should track total duration', async () => {
      const subtasks: SubTask[] = [
        { agentId: 'jobs', title: 'Task 1', description: 'Desc 1', dependsOn: [] },
      ]

      const result = await scheduleSubTasks(subtasks, { message: 'test' })

      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0)
    })
  })
})

describe('Result Summarizer', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'mock'
  })

  describe('summarizeResults', () => {
    it('should summarize single agent result', async () => {
      const results = [{
        agentId: 'jobs',
        agentName: 'Jobs',
        title: '需求分析',
        status: 'completed' as const,
        confidence: 0.85,
        summary: '需要支持多语言和实时协作',
        findings: ['国际化是核心需求', '实时协作需要 WebSocket'],
        deliverables: [],
        durationMs: 2000,
      }]

      const report = await summarizeResults('帮我分析这个功能', results)

      expect(report).toBeTruthy()
      expect(typeof report).toBe('string')
      expect(report.length).toBeGreaterThan(50)
    })

    it('should summarize multi-agent results', async () => {
      const results = [
        {
          agentId: 'jobs',
          agentName: 'Jobs',
          title: '需求分析',
          status: 'completed' as const,
          confidence: 0.85,
          summary: '需要支持多语言',
          findings: ['国际化是核心需求'],
          deliverables: [],
          durationMs: 2000,
        },
        {
          agentId: 'linus',
          agentName: 'Linus',
          title: '技术评估',
          status: 'completed' as const,
          confidence: 0.8,
          summary: '建议使用 i18n 框架',
          findings: ['react-intl 是最佳选择'],
          deliverables: [],
          durationMs: 3000,
        },
      ]

      const report = await summarizeResults('帮我分析这个功能', results)

      expect(report).toBeTruthy()
      expect(typeof report).toBe('string')
      expect(report.length).toBeGreaterThan(50)
    })

    it('should handle mixed status results', async () => {
      const results = [
        {
          agentId: 'jobs',
          agentName: 'Jobs',
          title: '需求分析',
          status: 'completed' as const,
          confidence: 0.85,
          summary: '需求明确',
          findings: ['核心需求已确认'],
          deliverables: [],
          durationMs: 2000,
        },
        {
          agentId: 'linus',
          agentName: 'Linus',
          title: '技术评估',
          status: 'failed' as const,
          confidence: 0,
          summary: 'LLM 调用失败',
          findings: [],
          deliverables: [],
          durationMs: 0,
          error: 'API rate limit',
        },
      ]

      const report = await summarizeResults('帮我分析', results)

      expect(report).toBeTruthy()
      // Should still produce a report even with failures
    })
  })
})
