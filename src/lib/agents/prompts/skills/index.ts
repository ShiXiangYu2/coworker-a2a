/**
 * Skill Prompt 注册表
 *
 * 管理所有可用的 Skill Prompt，支持按名称或 Agent ID 加载。
 * Skill 来源：auto-dev-framework/.agent/skills/
 */

import { GRILL_ME_SKILL_PROMPT } from './grill-me'
import { TO_PRD_SKILL_PROMPT } from './to-prd'
import { TDD_SKILL_PROMPT } from './tdd'
import { DIAGNOSE_SKILL_PROMPT } from './diagnose'
import { LOOP_REVIEW_SKILL_PROMPT } from './loop-review'
import { AI_BUILDER_METHODOLOGY_SKILL_PROMPT } from './ai-builder-methodology'
import { ZOOM_OUT_SKILL_PROMPT } from './zoom-out'

/** Skill Prompt 定义 */
export interface SkillPrompt {
  /** Skill 名称 */
  name: string
  /** Skill 描述 */
  description: string
  /** 来源 Skill 的原始名称 */
  sourceSkill: string
  /** 适用的 Agent ID 列表 */
  applicableAgents: string[]
  /** System Prompt 内容 */
  prompt: string
}

/** 所有已注册的 Skill Prompt */
const skillPrompts: SkillPrompt[] = [
  {
    name: 'ai-builder-methodology',
    description: 'AI Builder 总控编排，阶段判断与下游 Skill 调度',
    sourceSkill: 'ai-builder-methodology',
    applicableAgents: ['elon'],
    prompt: AI_BUILDER_METHODOLOGY_SKILL_PROMPT,
  },
  {
    name: 'grill-me',
    description: '穷尽式追问，直到与用户达成共识',
    sourceSkill: 'grill-me',
    applicableAgents: ['jobs'],
    prompt: GRILL_ME_SKILL_PROMPT,
  },
  {
    name: 'to-prd',
    description: '将对话上下文转化为 PRD 文档',
    sourceSkill: 'to-prd',
    applicableAgents: ['jobs'],
    prompt: TO_PRD_SKILL_PROMPT,
  },
  {
    name: 'tdd',
    description: '测试驱动开发，红-绿-重构循环',
    sourceSkill: 'tdd',
    applicableAgents: ['linus'],
    prompt: TDD_SKILL_PROMPT,
  },
  {
    name: 'diagnose',
    description: '严谨的 Bug 诊断循环',
    sourceSkill: 'diagnose',
    applicableAgents: ['turing'],
    prompt: DIAGNOSE_SKILL_PROMPT,
  },
  {
    name: 'loop-review',
    description: '独立审查 Sub-Agent',
    sourceSkill: 'loop-review',
    applicableAgents: ['turing'],
    prompt: LOOP_REVIEW_SKILL_PROMPT,
  },
  {
    name: 'zoom-out',
    description: '放大视角，提供全局商业和市场洞察',
    sourceSkill: 'zoom-out',
    applicableAgents: ['bezos'],
    prompt: ZOOM_OUT_SKILL_PROMPT,
  },
]

/**
 * 获取所有 Skill Prompt
 */
export function getAllSkillPrompts(): SkillPrompt[] {
  return skillPrompts
}

/**
 * 按名称获取 Skill Prompt
 */
export function getSkillPromptByName(name: string): SkillPrompt | undefined {
  return skillPrompts.find((s) => s.name === name)
}

/**
 * 获取指定 Agent 的所有 Skill Prompt
 */
export function getSkillPromptsForAgent(agentId: string): SkillPrompt[] {
  return skillPrompts.filter((s) => s.applicableAgents.includes(agentId))
}

/**
 * 为指定 Agent 构建完整的 System Prompt
 *
 * 拼接顺序：Agent 角色描述 + Skill 行为规范 + 输出格式要求
 */
export function buildAgentSystemPrompt(
  agentId: string,
  agentName: string,
  agentTitle: string,
  agentDescription: string,
  responsibilities: string[],
  skillNames?: string[]
): string {
  const parts: string[] = []

  // 1. Agent 角色描述
  parts.push(`# ${agentName} — ${agentTitle}

${agentDescription}

## 你的职责
${responsibilities.map((r) => `- ${r}`).join('\n')}

## 安全边界
你是一个分析型 Agent。你只产出结构化分析结果，不执行工具、命令、文件编辑、Git 操作、部署或外部 API 调用。`)

  // 2. Skill 行为规范
  if (skillNames && skillNames.length > 0) {
    const skills = skillNames
      .map((name) => getSkillPromptByName(name))
      .filter(Boolean) as SkillPrompt[]

    if (skills.length > 0) {
      parts.push('\n## 可用 Skills')
      parts.push('你可以使用以下 Skill 来完成任务：')
      for (const skill of skills) {
        parts.push(`\n### ${skill.name} — ${skill.description}`)
        parts.push(skill.prompt)
      }
    }
  }

  // 3. 输出格式要求
  parts.push(`

## 输出格式

你的分析结果必须是有效的 JSON，包含以下字段：
- status: "completed" | "blocked" | "needs_human_confirmation" | "failed"
- confidence: 0.0-1.0
- summary: 一句话总结
- findings: 字符串数组，列出关键发现
- proposedChanges: 建议变更数组
- next: { recommendedAction, reason }
- sideEffects: { filesChanged: [], branchesCreated: [], prsCreated: [], issuesUpdated: [] }
- needsHumanConfirmation: boolean
- safetyNotes: 安全提示数组`)

  return parts.join('\n')
}
