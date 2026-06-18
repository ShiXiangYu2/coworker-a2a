/**
 * Skill Prompt 注册表
 *
 * 管理所有可用的 Skill Prompt，支持按名称或 Agent ID 加载。
 * Skill 来源：auto-dev-framework/.agent/skills/
 */

import { GRILL_ME_SKILL_PROMPT } from './grill-me'
import { GRILL_WITH_DOCS_SKILL_PROMPT } from './grill-with-docs'
import { TO_PRD_SKILL_PROMPT } from './to-prd'
import { TDD_SKILL_PROMPT } from './tdd'
import { DIAGNOSE_SKILL_PROMPT } from './diagnose'
import { LOOP_REVIEW_SKILL_PROMPT } from './loop-review'
import { AI_BUILDER_METHODOLOGY_SKILL_PROMPT } from './ai-builder-methodology'
import { ZOOM_OUT_SKILL_PROMPT } from './zoom-out'
import { PROTOTYPE_SKILL_PROMPT } from './prototype'
import { UI_REVIEW_SKILL_PROMPT } from './ui-review'
import { KNOWLEDGE_TO_SKILL_SKILL_PROMPT } from './knowledge-to-skill'
import { API_DESIGN_SKILL_PROMPT } from './api-design'
import { DB_DESIGN_SKILL_PROMPT } from './db-design'
import { IMPROVE_CODEBASE_ARCHITECTURE_SKILL_PROMPT } from './improve-codebase-architecture'
import { HANDOFF_SKILL_PROMPT } from './handoff'
import { TO_ISSUES_SKILL_PROMPT } from './to-issues'
import { TRIAGE_SKILL_PROMPT } from './triage'
import { CLEANUP_MISSION_SKILL_PROMPT } from './cleanup-mission'
import { SIGNAL_ANALYZER_SKILL_PROMPT } from './signal-analyzer'

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
  {
    name: 'grill-with-docs',
    description: '带文档审查的追问，挑战计划并更新 CONTEXT.md 和 ADRs',
    sourceSkill: 'grill-with-docs',
    applicableAgents: ['jobs'],
    prompt: GRILL_WITH_DOCS_SKILL_PROMPT,
  },
  {
    name: 'prototype',
    description: '快速原型验证，回答设计问题后再决定保留或丢弃',
    sourceSkill: 'prototype',
    applicableAgents: ['jobs'],
    prompt: PROTOTYPE_SKILL_PROMPT,
  },
  {
    name: 'ui-review',
    description: '标准化 UI 走查流程，检查页面加载、响应式布局、交互反馈',
    sourceSkill: 'ui-review',
    applicableAgents: ['jobs', 'turing'],
    prompt: UI_REVIEW_SKILL_PROMPT,
  },
  {
    name: 'knowledge-to-skill',
    description: '知识到 Skill 提取，把书籍、课程、经验转化为可调用能力',
    sourceSkill: 'knowledge-to-skill',
    applicableAgents: ['jobs'],
    prompt: KNOWLEDGE_TO_SKILL_SKILL_PROMPT,
  },
  {
    name: 'api-design',
    description: '标准化 API 设计流程，生成 API 文档、Mock 数据和测试用例',
    sourceSkill: 'api-design',
    applicableAgents: ['linus'],
    prompt: API_DESIGN_SKILL_PROMPT,
  },
  {
    name: 'db-design',
    description: '标准化数据库设计流程，生成数据模型、迁移脚本和种子数据',
    sourceSkill: 'db-design',
    applicableAgents: ['linus'],
    prompt: DB_DESIGN_SKILL_PROMPT,
  },
  {
    name: 'improve-codebase-architecture',
    description: '发现代码库架构深化机会，将浅模块转化为深模块',
    sourceSkill: 'improve-codebase-architecture',
    applicableAgents: ['linus'],
    prompt: IMPROVE_CODEBASE_ARCHITECTURE_SKILL_PROMPT,
  },
  {
    name: 'handoff',
    description: '将当前对话压缩为交接文档，让另一个 Agent 可以继续工作',
    sourceSkill: 'handoff',
    applicableAgents: ['linus'],
    prompt: HANDOFF_SKILL_PROMPT,
  },
  {
    name: 'to-issues',
    description: '将计划、规格或 PRD 拆分为可独立领取的 Issue',
    sourceSkill: 'to-issues',
    applicableAgents: ['elon'],
    prompt: TO_ISSUES_SKILL_PROMPT,
  },
  {
    name: 'triage',
    description: 'Issue 分类，通过状态机驱动的分类角色管理 Issue',
    sourceSkill: 'triage',
    applicableAgents: ['elon'],
    prompt: TRIAGE_SKILL_PROMPT,
  },
  {
    name: 'cleanup-mission',
    description: '清理部分完成的 Mission 创建的所有资源',
    sourceSkill: 'cleanup-mission',
    applicableAgents: ['elon'],
    prompt: CLEANUP_MISSION_SKILL_PROMPT,
  },
  {
    name: 'signal-analyzer',
    description: '对原始发现进行交叉分析，识别关联模式并生成行动建议',
    sourceSkill: 'signal-analyzer',
    applicableAgents: ['bezos'],
    prompt: SIGNAL_ANALYZER_SKILL_PROMPT,
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
