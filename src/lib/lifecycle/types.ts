/**
 * Lifecycle Types — 六阶段主生命周期类型定义
 *
 * 对齐 learning-materials 建议的六阶段主流程：
 *   intake → consensus → planning → execution → review → repair
 *
 * 每个任务都必须经过这六个阶段，形成统一的主生命周期。
 */

// ─── 生命周期阶段 ──────────────────────────────────────────────────

export type LifecycleStage =
  | 'intake'        // 采访：接收用户需求，理解意图
  | 'consensus'     // 工程共识：与用户达成需求共识
  | 'planning'      // 计划：分解任务，制定方案
  | 'execution'     // 执行：Agent 执行具体工作
  | 'review'        // 审查：质量检查，人工审查
  | 'repair'        // 修复：根据审查结果修复问题

/** 阶段元数据 */
export interface StageMetadata {
  stage: LifecycleStage
  /** 阶段显示名称 */
  displayName: string
  /** 阶段描述 */
  description: string
  /** 阶段图标 */
  icon: string
  /** 阶段颜色（用于 UI） */
  color: string
  /** 预期耗时 */
  expectedDuration: string
  /** 负责的 Agent */
  responsibleAgents: string[]
  /** 阶段产出 */
  outputs: string[]
}

// ─── 阶段定义 ──────────────────────────────────────────────────────

export const STAGE_DEFINITIONS: Record<LifecycleStage, StageMetadata> = {
  intake: {
    stage: 'intake',
    displayName: '采访',
    description: '接收用户需求，理解意图，收集上下文信息',
    icon: '🎤',
    color: '#3B82F6',
    expectedDuration: '< 1 min',
    responsibleAgents: ['elon', 'jobs'],
    outputs: ['需求摘要', '上下文信息', '初始路由决策'],
  },
  consensus: {
    stage: 'consensus',
    displayName: '工程共识',
    description: '与用户确认需求理解，澄清不明确的部分，达成共识',
    icon: '🤝',
    color: '#8B5CF6',
    expectedDuration: '< 2 min',
    responsibleAgents: ['jobs', 'elon'],
    outputs: ['确认的需求', '验收标准', '风险评估'],
  },
  planning: {
    stage: 'planning',
    displayName: '计划',
    description: '分解任务，制定技术方案，分配给合适的 Agent',
    icon: '📋',
    color: '#F59E0B',
    expectedDuration: '< 3 min',
    responsibleAgents: ['elon', 'jobs', 'linus'],
    outputs: ['任务分解', '技术方案', '执行计划'],
  },
  execution: {
    stage: 'execution',
    displayName: '执行',
    description: 'Agent 执行具体工作：写代码、做分析、生成内容',
    icon: '⚡',
    color: '#10B981',
    expectedDuration: 'varies',
    responsibleAgents: ['linus', 'turing', 'bezos', 'jobs'],
    outputs: ['代码', '分析报告', '内容产出', '测试结果'],
  },
  review: {
    stage: 'review',
    displayName: '审查',
    description: '质量检查，人工审查，确认产出符合要求',
    icon: '🔍',
    color: '#EF4444',
    expectedDuration: '< 2 min',
    responsibleAgents: ['turing', 'kelvin'],
    outputs: ['审查结论', '问题清单', '批准/拒绝'],
  },
  repair: {
    stage: 'repair',
    displayName: '修复',
    description: '根据审查结果修复问题，重新验证',
    icon: '🔧',
    color: '#6366F1',
    expectedDuration: 'varies',
    responsibleAgents: ['linus', 'turing'],
    outputs: ['修复代码', '回归测试', '重新提交审查'],
  },
}

// ─── 阶段转换 ──────────────────────────────────────────────────────

/** 允许的阶段转换 */
export const VALID_TRANSITIONS: Record<LifecycleStage, LifecycleStage[]> = {
  intake: ['consensus'],
  consensus: ['planning', 'intake'],  // 可能需要回到 intake 重新理解
  planning: ['execution', 'consensus'],  // 可能需要回到 consensus 重新确认
  execution: ['review', 'planning'],  // 可能需要回到 planning 重新规划
  review: ['repair', 'execution'],  // 审查不通过可能需要回到 execution
  repair: ['review', 'execution'],  // 修复后需要重新审查或继续执行
}

/** 终态（任务完成） */
export const TERMINAL_STAGES: LifecycleStage[] = ['review']  // 审查通过 = 完成

/** 需要人工确认的阶段转换 */
export const HUMAN_CONFIRMATION_REQUIRED: Array<{ from: LifecycleStage; to: LifecycleStage }> = [
  { from: 'execution', to: 'review' },  // 执行完成需要人工审查
  { from: 'review', to: 'repair' },     // 审查不通过需要人工确认
]

// ─── 辅助函数 ──────────────────────────────────────────────────────

/**
 * 检查阶段转换是否有效
 */
export function isValidTransition(from: LifecycleStage, to: LifecycleStage): boolean {
  const allowed = VALID_TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}

/**
 * 获取阶段元数据
 */
export function getStageMetadata(stage: LifecycleStage): StageMetadata {
  return STAGE_DEFINITIONS[stage as keyof typeof STAGE_DEFINITIONS]
}

/**
 * 获取所有阶段（按顺序）
 */
export function getAllStages(): StageMetadata[] {
  const stages: LifecycleStage[] = ['intake', 'consensus', 'planning', 'execution', 'review', 'repair']
  return stages.map((stage) => STAGE_DEFINITIONS[stage])
}

/**
 * 获取阶段进度百分比
 */
export function getStageProgress(currentStage: LifecycleStage): number {
  const stages: LifecycleStage[] = ['intake', 'consensus', 'planning', 'execution', 'review', 'repair']
  const currentIndex = stages.indexOf(currentStage)
  return Math.round(((currentIndex + 1) / stages.length) * 100)
}

/**
 * 判断任务是否已完成
 */
export function isTaskCompleted(stage: LifecycleStage, status: string): boolean {
  return stage === 'review' && status === 'completed'
}
