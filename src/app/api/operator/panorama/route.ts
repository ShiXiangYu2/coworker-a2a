import { NextRequest } from 'next/server'
import { getAgents } from '@/lib/agents/registry'
import { toolRegistry } from '@/lib/tools/registry'

export async function GET(request: NextRequest) {
  try {
    // 获取 Agent 信息
    const agents = getAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      title: agent.title,
      description: agent.description,
      responsibilities: agent.responsibilities,
      skills: agent.skillPromptNames ?? agent.skillRefs ?? [],
      stats: {
        totalRuns: 0, // TODO: 从数据库统计
        successRate: 0.95, // TODO: 从数据库统计
        avgDurationMs: 5000, // TODO: 从数据库统计
        commonErrors: [], // TODO: 从数据库统计
      },
    }))

    // 获取 Skill 信息
    const skills = [
      {
        id: 'grill-me',
        name: 'grill-me',
        description: '穷尽式追问用户需求，直到达成共识',
        phase: 'consensus',
        inputSchema: '{ message: string }',
        outputSchema: '{ questions: string[] }',
        usageCount: 10,
        promptFile: '.agent/skills/grill-me/SKILL.md',
      },
      {
        id: 'diagnose',
        name: 'diagnose',
        description: 'Bug 诊断循环',
        phase: 'repair',
        inputSchema: '{ issue: string }',
        outputSchema: '{ diagnosis: string, fix: string }',
        usageCount: 5,
        promptFile: '.agent/skills/diagnose/SKILL.md',
      },
      {
        id: 'tdd',
        name: 'tdd',
        description: '测试驱动开发',
        phase: 'execution',
        inputSchema: '{ requirement: string }',
        outputSchema: '{ tests: string[], code: string }',
        usageCount: 8,
        promptFile: '.agent/skills/tdd/SKILL.md',
      },
    ]

    // 获取 Tool 信息
    const tools = toolRegistry.tools.map((tool) => ({
      id: tool.id,
      name: tool.name,
      category: tool.category,
      riskLevel: tool.riskLevel,
      usageCount: 0, // TODO: 从数据库统计
      successRate: 1.0, // TODO: 从数据库统计
    }))

    // 计算摘要
    const avgSuccessRate = agents.length > 0
      ? agents.reduce((sum, a) => sum + a.stats.successRate, 0) / agents.length
      : 0

    return Response.json({
      ok: true,
      data: {
        agents,
        skills,
        tools,
        summary: {
          totalAgents: agents.length,
          totalSkills: skills.length,
          totalTools: tools.length,
          avgSuccessRate,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to build panorama'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
