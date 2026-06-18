import type { AgentId, RouteDecision, RouteMessageInput, RouteNextAction } from './types'

type Rule = {
  agentId: AgentId
  signals: string[]
  title: string
  reason: string
}

const emptySideEffects = {
  filesChanged: [],
  branchesCreated: [],
  prsCreated: [],
  issuesUpdated: [],
}

const humanConfirmationSignals = [
  'delete',
  'remove',
  'clear',
  'reset',
  'rollback',
  'publish',
  'deploy',
  'release',
  'send email',
  'send message',
  'push',
  'merge',
  'create pr',
  'pull request',
  'payment',
  'purchase',
  'permission',
  'secret',
  'env',
  'production',
  'migration',
  'schema migration',
  'drop table',
  'branch delete',
  'worktree delete',
  '删除',
  '批量删除',
  '清空',
  '重置',
  '覆盖',
  '回滚',
  '发布',
  '上线',
  '部署',
  '发邮件',
  '发消息',
  '提交 pr',
  '创建 pr',
  '合并',
  '付款',
  '购买',
  '权限',
  '密钥',
  '生产配置',
  '数据库迁移',
  '删除分支',
  '删除 worktree',
]

const unsupportedSignals = [
  'real api',
  'third party',
  'gmail',
  'google drive',
  'feishu',
  'lark',
  'obsidian',
  '真实调用',
  '第三方',
  '飞书',
  '邮箱',
  '知识库',
  '外部系统',
]

const rules: Rule[] = [
  {
    agentId: 'elon',
    title: 'Coordinate an Agent-company plan',
    reason: 'The message asks for decomposition, planning, or cross-agent coordination.',
    signals: [
      'roadmap',
      'decompose',
      'plan',
      'multi-agent',
      'agent',
      'end-to-end',
      'system',
      'coordinate',
      'from zero',
      '路线图',
      '拆解',
      '计划',
      '多 agent',
      '多智能体',
      '协作',
      '完整方案',
      '端到端',
      '系统性',
      '从零到一',
    ],
  },
  {
    agentId: 'jobs',
    title: 'Shape product requirements',
    reason: 'The message is primarily about product requirements or user experience.',
    signals: [
      'prd',
      'requirement',
      'product',
      'user story',
      'prototype',
      'ux',
      'interaction',
      'acceptance criteria',
      'feature design',
      '需求',
      '产品',
      '用户故事',
      '原型',
      '体验',
      '交互',
      '验收标准',
      '功能设计',
    ],
  },
  {
    agentId: 'linus',
    title: 'Design or implement engineering work',
    reason: 'The message is primarily about architecture, code, APIs, or data models.',
    signals: [
      'code',
      'implement',
      'architecture',
      'api',
      'database',
      'next.js',
      'prisma',
      'refactor',
      'performance',
      'module',
      '代码',
      '实现',
      '架构',
      '接口',
      '数据库',
      '重构',
      '性能',
      '模块',
      '技术方案',
    ],
  },
  {
    agentId: 'turing',
    title: 'Verify quality and correctness',
    reason: 'The message is primarily about testing, eval, review, or failure diagnosis.',
    signals: [
      'test',
      'eval',
      'acceptance',
      'bug',
      'diagnose',
      'review',
      'quality',
      'regression',
      'lint',
      'build',
      '测试',
      '验收',
      '诊断',
      '质量',
      '回归',
      '评审',
      '审查',
      '失败',
    ],
  },
  {
    agentId: 'bezos',
    title: 'Analyze customer and market signals',
    reason: 'The message is primarily about customers, market feedback, or business value.',
    signals: [
      'customer',
      'feedback',
      'market',
      'competitor',
      'business',
      'pricing',
      'growth',
      'retention',
      'conversion',
      '客户',
      '用户反馈',
      '市场',
      '竞品',
      '商业',
      '定价',
      '增长',
      '留存',
      '转化',
    ],
  },
]

const chatOnlySignals = [
  'explain',
  'what is',
  'what are',
  'hello',
  'hi',
  '概念',
  '解释',
  '是什么',
  '你好',
  '闲聊',
]

const taskActionSignals = [
  'write',
  'build',
  'design',
  'implement',
  'create',
  'add',
  'fix',
  'review',
  'test',
  'analyze',
  'plan',
  '帮我写',
  '实现',
  '创建',
  '新增',
  '修复',
  '评审',
  '测试',
  '分析',
  '设计',
  '规划',
]

function matchedSignals(message: string, signals: string[]): string[] {
  return signals.filter((signal) => message.includes(signal.toLowerCase()))
}

function makeDecision(args: {
  decisionType: RouteDecision['decisionType']
  targetAgentId?: AgentId
  confidence: number
  reason: string
  matchedSignals: string[]
  suggestedTaskTitle?: string
  requiresHumanConfirmation?: boolean
  recommendedAction: RouteNextAction
}): RouteDecision {
  const status =
    args.decisionType === 'needs_human_confirmation'
      ? 'blocked'
      : args.decisionType === 'unsupported'
        ? 'unsupported'
        : 'ready'

  return {
    status,
    decisionType: args.decisionType,
    targetAgentId: args.targetAgentId,
    confidence: args.confidence,
    reason: args.reason,
    matchedSignals: args.matchedSignals,
    suggestedTaskTitle: args.suggestedTaskTitle,
    requiresHumanConfirmation: args.requiresHumanConfirmation ?? false,
    next: {
      recommendedAction: args.recommendedAction,
      reason: args.reason,
    },
    sideEffects: emptySideEffects,
  }
}

export function routeMessage(input: RouteMessageInput): RouteDecision {
  const text = input.message.trim().toLowerCase()
  if (!text) {
    return makeDecision({
      decisionType: 'unsupported',
      confidence: 0,
      reason: 'Message is empty.',
      matchedSignals: [],
      recommendedAction: 'show_unsupported',
    })
  }

  const humanMatches = matchedSignals(text, humanConfirmationSignals)
  if (humanMatches.length > 0) {
    return makeDecision({
      decisionType: 'needs_human_confirmation',
      targetAgentId: 'kelvin',
      confidence: 0.95,
      reason: 'The request may create external impact or irreversible side effects and needs Kelvin approval.',
      matchedSignals: humanMatches,
      suggestedTaskTitle: 'Review high-risk action',
      requiresHumanConfirmation: true,
      recommendedAction: 'ask_human_confirmation',
    })
  }

  const unsupportedMatches = matchedSignals(text, unsupportedSignals)
  if (unsupportedMatches.length > 0) {
    return makeDecision({
      decisionType: 'unsupported',
      confidence: 0.82,
      reason: 'The request depends on integrations that are outside Sprint 2 scope.',
      matchedSignals: unsupportedMatches,
      recommendedAction: 'show_unsupported',
    })
  }

  const chatMatches = matchedSignals(text, chatOnlySignals)
  if (chatMatches.length > 0 && matchedSignals(text, taskActionSignals).length === 0) {
    return makeDecision({
      decisionType: 'chat_only',
      confidence: 0.86,
      reason: 'The message asks for a lightweight explanation rather than production work.',
      matchedSignals: chatMatches,
      recommendedAction: 'continue_chat',
    })
  }

  const scoredRules = rules
    .map((rule) => ({ rule, matches: matchedSignals(text, rule.signals) }))
    .filter(({ matches }) => matches.length > 0)
    .sort((a, b) => b.matches.length - a.matches.length)

  if (scoredRules.length > 0) {
    const { rule, matches } = scoredRules[0]
    return makeDecision({
      decisionType: 'delegate_to_agent',
      targetAgentId: rule.agentId,
      confidence: Math.min(0.65 + matches.length * 0.08, 0.95),
      reason: rule.reason,
      matchedSignals: matches,
      suggestedTaskTitle: rule.title,
      recommendedAction: 'show_route_suggestion',
    })
  }

  return makeDecision({
    decisionType: 'chat_only',
    confidence: chatMatches.length > 0 ? 0.86 : 0.62,
    reason: 'No production task intent was detected, so the message should stay in normal chat.',
    matchedSignals: chatMatches,
    recommendedAction: 'continue_chat',
  })
}
