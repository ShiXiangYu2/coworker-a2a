import { describe, it, expect } from 'vitest'
import {
  getAllSkillPrompts,
  getSkillPromptByName,
  getSkillPromptsForAgent,
  buildAgentSystemPrompt,
} from '../index'

describe('Skill Prompts', () => {
  describe('getAllSkillPrompts', () => {
    it('should return 20 skill prompts', () => {
      const skills = getAllSkillPrompts()
      expect(skills).toHaveLength(20)
    })

    it('should have all required fields', () => {
      const skills = getAllSkillPrompts()
      for (const skill of skills) {
        expect(skill.name).toBeTruthy()
        expect(skill.description).toBeTruthy()
        expect(skill.sourceSkill).toBeTruthy()
        expect(skill.applicableAgents.length).toBeGreaterThan(0)
        expect(skill.prompt).toBeTruthy()
      }
    })
  })

  describe('getSkillPromptByName', () => {
    it('should find grill-me', () => {
      const skill = getSkillPromptByName('grill-me')
      expect(skill).toBeDefined()
      expect(skill?.name).toBe('grill-me')
      expect(skill?.applicableAgents).toContain('jobs')
    })

    it('should find to-prd', () => {
      const skill = getSkillPromptByName('to-prd')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('jobs')
    })

    it('should find tdd', () => {
      const skill = getSkillPromptByName('tdd')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('linus')
    })

    it('should find diagnose', () => {
      const skill = getSkillPromptByName('diagnose')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('turing')
    })

    it('should find loop-review', () => {
      const skill = getSkillPromptByName('loop-review')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('turing')
    })

    it('should find ai-builder-methodology', () => {
      const skill = getSkillPromptByName('ai-builder-methodology')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('elon')
    })

    it('should find zoom-out', () => {
      const skill = getSkillPromptByName('zoom-out')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('bezos')
    })

    it('should find grill-with-docs', () => {
      const skill = getSkillPromptByName('grill-with-docs')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('jobs')
    })

    it('should find prototype', () => {
      const skill = getSkillPromptByName('prototype')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('jobs')
    })

    it('should find ui-review', () => {
      const skill = getSkillPromptByName('ui-review')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('jobs')
    })

    it('should find knowledge-to-skill', () => {
      const skill = getSkillPromptByName('knowledge-to-skill')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('jobs')
    })

    it('should find api-design', () => {
      const skill = getSkillPromptByName('api-design')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('linus')
    })

    it('should find db-design', () => {
      const skill = getSkillPromptByName('db-design')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('linus')
    })

    it('should find improve-codebase-architecture', () => {
      const skill = getSkillPromptByName('improve-codebase-architecture')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('linus')
    })

    it('should find handoff', () => {
      const skill = getSkillPromptByName('handoff')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('linus')
    })

    it('should find to-issues', () => {
      const skill = getSkillPromptByName('to-issues')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('elon')
    })

    it('should find triage', () => {
      const skill = getSkillPromptByName('triage')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('elon')
    })

    it('should find cleanup-mission', () => {
      const skill = getSkillPromptByName('cleanup-mission')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('elon')
    })

    it('should find signal-analyzer', () => {
      const skill = getSkillPromptByName('signal-analyzer')
      expect(skill).toBeDefined()
      expect(skill?.applicableAgents).toContain('bezos')
    })

    it('should return undefined for unknown skill', () => {
      const skill = getSkillPromptByName('nonexistent')
      expect(skill).toBeUndefined()
    })
  })

  describe('getSkillPromptsForAgent', () => {
    it('should return 6 skills for jobs', () => {
      const skills = getSkillPromptsForAgent('jobs')
      expect(skills.map((s) => s.name)).toEqual([
        'grill-me',
        'grill-with-docs',
        'to-prd',
        'prototype',
        'ui-review',
        'knowledge-to-skill',
      ])
    })

    it('should return 5 skills for linus', () => {
      const skills = getSkillPromptsForAgent('linus')
      expect(skills.map((s) => s.name)).toEqual([
        'tdd',
        'api-design',
        'db-design',
        'improve-codebase-architecture',
        'handoff',
      ])
    })

    it('should return diagnose and loop-review for turing', () => {
      const skills = getSkillPromptsForAgent('turing')
      expect(skills.map((s) => s.name)).toEqual(['diagnose', 'loop-review', 'ui-review'])
    })

    it('should return 4 skills for elon', () => {
      const skills = getSkillPromptsForAgent('elon')
      expect(skills.map((s) => s.name)).toEqual([
        'ai-builder-methodology',
        'to-issues',
        'triage',
        'cleanup-mission',
      ])
    })

    it('should return 2 skills for bezos', () => {
      const skills = getSkillPromptsForAgent('bezos')
      expect(skills.map((s) => s.name)).toEqual(['zoom-out', 'signal-analyzer'])
    })

    it('should return empty array for unknown agent', () => {
      const skills = getSkillPromptsForAgent('unknown')
      expect(skills).toHaveLength(0)
    })
  })

  describe('buildAgentSystemPrompt', () => {
    it('should include agent role description', () => {
      const prompt = buildAgentSystemPrompt(
        'jobs',
        'Jobs',
        'Product Agent',
        'Shapes requirements',
        ['Clarify requirements', 'Write PRDs'],
        ['grill-me']
      )

      expect(prompt).toContain('Jobs')
      expect(prompt).toContain('Product Agent')
      expect(prompt).toContain('Shapes requirements')
      expect(prompt).toContain('Clarify requirements')
    })

    it('should include skill prompt when skillNames provided', () => {
      const prompt = buildAgentSystemPrompt(
        'jobs',
        'Jobs',
        'Product Agent',
        'Shapes requirements',
        ['Clarify requirements'],
        ['grill-me']
      )

      expect(prompt).toContain('## 可用 Skills')
      expect(prompt).toContain('grill-me')
      expect(prompt).toContain('穷尽式追问')
    })

    it('should include multiple skills', () => {
      const prompt = buildAgentSystemPrompt(
        'turing',
        'Turing',
        'Verification Agent',
        'Verifies quality',
        ['Design tests'],
        ['diagnose', 'loop-review']
      )

      expect(prompt).toContain('diagnose')
      expect(prompt).toContain('loop-review')
      expect(prompt).toContain('Bug 诊断循环')
      expect(prompt).toContain('独立审查')
    })

    it('should include output format requirements', () => {
      const prompt = buildAgentSystemPrompt(
        'linus',
        'Linus',
        'Engineering Agent',
        'Designs architecture',
        ['Design technical architecture'],
        ['tdd']
      )

      expect(prompt).toContain('## 输出格式')
      expect(prompt).toContain('status')
      expect(prompt).toContain('confidence')
      expect(prompt).toContain('summary')
    })

    it('should include safety boundary', () => {
      const prompt = buildAgentSystemPrompt(
        'jobs',
        'Jobs',
        'Product Agent',
        'Shapes requirements',
        ['Clarify requirements'],
        ['grill-me']
      )

      expect(prompt).toContain('安全边界')
      expect(prompt).toContain('分析型 Agent')
    })

    it('should work without skillNames', () => {
      const prompt = buildAgentSystemPrompt(
        'bezos',
        'Bezos',
        'Customer Agent',
        'Analyzes feedback',
        ['Analyze customer feedback'],
        undefined
      )

      expect(prompt).toContain('Bezos')
      expect(prompt).toContain('Customer Agent')
      expect(prompt).not.toContain('## 可用 Skills')
    })

    it('should include new Jobs skills in prompt', () => {
      const prompt = buildAgentSystemPrompt(
        'jobs',
        'Jobs',
        'Product Agent',
        'Shapes requirements',
        ['Clarify requirements'],
        ['grill-me', 'grill-with-docs', 'prototype']
      )

      expect(prompt).toContain('grill-with-docs')
      expect(prompt).toContain('prototype')
      expect(prompt).toContain('带文档审查的追问')
      expect(prompt).toContain('原型验证')
    })

    it('should include new Linus skills in prompt', () => {
      const prompt = buildAgentSystemPrompt(
        'linus',
        'Linus',
        'Engineering Agent',
        'Designs architecture',
        ['Design technical architecture'],
        ['tdd', 'api-design', 'db-design']
      )

      expect(prompt).toContain('api-design')
      expect(prompt).toContain('db-design')
      expect(prompt).toContain('API 设计')
      expect(prompt).toContain('数据库设计')
    })

    it('should include new Elon skills in prompt', () => {
      const prompt = buildAgentSystemPrompt(
        'elon',
        'Elon',
        'CEO Agent',
        'Understands goals',
        ['Route user intent'],
        ['ai-builder-methodology', 'to-issues', 'triage']
      )

      expect(prompt).toContain('to-issues')
      expect(prompt).toContain('triage')
      expect(prompt).toContain('垂直切片拆分')
      expect(prompt).toContain('Issue 分类')
    })

    it('should include new Bezos skills in prompt', () => {
      const prompt = buildAgentSystemPrompt(
        'bezos',
        'Bezos',
        'Customer Agent',
        'Analyzes feedback',
        ['Analyze customer feedback'],
        ['zoom-out', 'signal-analyzer']
      )

      expect(prompt).toContain('signal-analyzer')
      expect(prompt).toContain('信号分析')
    })
  })
})
