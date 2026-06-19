// 循环执行引擎类型定义

export type LoopPhase =
  | 'requirement_analysis'   // 需求分析
  | 'code_generation'        // 代码生成
  | 'testing'                // 测试执行
  | 'review'                 // 代码审查
  | 'optimization'           // 优化
  | 'deployment'             // 部署

export type LoopStatus =
  | 'idle'                   // 空闲
  | 'running'                // 运行中
  | 'paused'                 // 暂停
  | 'completed'              // 完成
  | 'failed'                 // 失败

export type FeedbackType =
  | 'test_result'            // 测试结果
  | 'performance'            // 性能反馈
  | 'user_feedback'          // 用户反馈
  | 'code_quality'           // 代码质量

export interface LoopConfig {
  maxIterations: number      // 最大迭代次数
  timeoutMs: number          // 超时时间
  autoOptimize: boolean      // 是否自动优化
  feedbackThreshold: number  // 反馈阈值
}

export interface LoopIteration {
  id: string
  index: number
  phase: LoopPhase
  status: LoopStatus
  input: Record<string, unknown>
  output: Record<string, unknown>
  feedback: Feedback[]
  metrics: LoopMetrics
  startedAt: Date
  completedAt?: Date
  error?: string
}

export interface Feedback {
  id: string
  type: FeedbackType
  content: string
  score: number              // 0-100
  source: string
  createdAt: Date
}

export interface LoopMetrics {
  durationMs: number
  successRate: number
  improvementRate: number
  totalIterations: number
  averageScore: number
}

export interface LoopResult {
  id: string
  iterations: LoopIteration[]
  finalOutput: Record<string, unknown>
  metrics: LoopMetrics
  status: LoopStatus
  createdAt: Date
  completedAt?: Date
}

export interface AutomationStep {
  id: string
  name: string
  phase: LoopPhase
  action: string
  input: Record<string, unknown>
  output: Record<string, unknown>
  dependencies: string[]
  timeoutMs: number
}

export interface AutomationPipeline {
  id: string
  name: string
  steps: AutomationStep[]
  config: LoopConfig
  status: LoopStatus
  createdAt: Date
}
