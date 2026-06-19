// 反馈收集和优化模块

import { randomUUID } from 'node:crypto'
import type { Feedback, FeedbackType, LoopIteration, LoopMetrics } from './types'

export interface FeedbackCollector {
  collectTestResults(iteration: LoopIteration): Promise<Feedback[]>
  collectPerformanceMetrics(iteration: LoopIteration): Promise<Feedback[]>
  collectUserFeedback(iteration: LoopIteration): Promise<Feedback[]>
  collectCodeQuality(iteration: LoopIteration): Promise<Feedback[]>
}

export interface OptimizationEngine {
  analyzeFeedback(feedbacks: Feedback[]): Promise<OptimizationSuggestion[]>
  applyOptimizations(
    suggestions: OptimizationSuggestion[],
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>>
}

export interface OptimizationSuggestion {
  id: string
  type: 'performance' | 'quality' | 'structure' | 'testing'
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'low' | 'medium' | 'high'
  priority: number
}

export class DefaultFeedbackCollector implements FeedbackCollector {
  /**
   * 收集测试结果反馈
   */
  async collectTestResults(iteration: LoopIteration): Promise<Feedback[]> {
    const feedback: Feedback[] = []

    if (iteration.output.testResults) {
      const testResults = iteration.output.testResults as Record<string, number>
      const passed = testResults.passed ?? 0
      const total = testResults.total ?? 0
      const coverage = testResults.coverage ?? 0

      feedback.push({
        id: randomUUID(),
        type: 'test_result',
        content: `Tests: ${passed}/${total} passed, Coverage: ${coverage}%`,
        score: total > 0 ? (passed / total) * 100 : 0,
        source: 'test_runner',
        createdAt: new Date(),
      })
    }

    return feedback
  }

  /**
   * 收集性能指标反馈
   */
  async collectPerformanceMetrics(iteration: LoopIteration): Promise<Feedback[]> {
    const feedback: Feedback[] = []

    if (iteration.metrics.durationMs > 0) {
      // 根据执行时间计算性能分数
      const durationScore = Math.max(0, 100 - (iteration.metrics.durationMs / 1000))
      feedback.push({
        id: randomUUID(),
        type: 'performance',
        content: `Execution time: ${iteration.metrics.durationMs}ms`,
        score: durationScore,
        source: 'performance_monitor',
        createdAt: new Date(),
      })
    }

    return feedback
  }

  /**
   * 收集用户反馈
   */
  async collectUserFeedback(iteration: LoopIteration): Promise<Feedback[]> {
    // TODO: 集成用户反馈收集
    return []
  }

  /**
   * 收集代码质量反馈
   */
  async collectCodeQuality(iteration: LoopIteration): Promise<Feedback[]> {
    const feedback: Feedback[] = []

    if (iteration.output.reviewResults) {
      const reviewResults = iteration.output.reviewResults as Record<string, number>
      const issues = reviewResults.issues ?? 0
      const warnings = reviewResults.warnings ?? 0
      const suggestions = reviewResults.suggestions ?? 0

      const qualityScore = Math.max(0, 100 - issues * 10 - warnings * 5)
      feedback.push({
        id: randomUUID(),
        type: 'code_quality',
        content: `Issues: ${issues}, Warnings: ${warnings}, Suggestions: ${suggestions}`,
        score: qualityScore,
        source: 'code_reviewer',
        createdAt: new Date(),
      })
    }

    return feedback
  }
}

export class DefaultOptimizationEngine implements OptimizationEngine {
  /**
   * 分析反馈
   */
  async analyzeFeedback(feedbacks: Feedback[]): Promise<OptimizationSuggestion[]> {
    const suggestions: OptimizationSuggestion[] = []

    // 分析测试反馈
    const testFeedbacks = feedbacks.filter(f => f.type === 'test_result')
    if (testFeedbacks.length > 0) {
      const avgTestScore = testFeedbacks.reduce((s, f) => s + f.score, 0) / testFeedbacks.length
      if (avgTestScore < 80) {
        suggestions.push({
          id: randomUUID(),
          type: 'testing',
          description: '测试覆盖率不足，需要增加测试用例',
          impact: 'high',
          effort: 'medium',
          priority: 1,
        })
      }
    }

    // 分析代码质量反馈
    const qualityFeedbacks = feedbacks.filter(f => f.type === 'code_quality')
    if (qualityFeedbacks.length > 0) {
      const avgQualityScore = qualityFeedbacks.reduce((s, f) => s + f.score, 0) / qualityFeedbacks.length
      if (avgQualityScore < 80) {
        suggestions.push({
          id: randomUUID(),
          type: 'quality',
          description: '代码质量需要改进，存在较多问题',
          impact: 'high',
          effort: 'medium',
          priority: 2,
        })
      }
    }

    // 分析性能反馈
    const performanceFeedbacks = feedbacks.filter(f => f.type === 'performance')
    if (performanceFeedbacks.length > 0) {
      const avgPerformanceScore = performanceFeedbacks.reduce((s, f) => s + f.score, 0) / performanceFeedbacks.length
      if (avgPerformanceScore < 70) {
        suggestions.push({
          id: randomUUID(),
          type: 'performance',
          description: '性能需要优化，执行时间过长',
          impact: 'medium',
          effort: 'high',
          priority: 3,
        })
      }
    }

    return suggestions.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 应用优化建议
   */
  async applyOptimizations(
    suggestions: OptimizationSuggestion[],
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const optimizedInput = { ...input }

    for (const suggestion of suggestions) {
      switch (suggestion.type) {
        case 'testing':
          optimizedInput.needsMoreTests = true
          break
        case 'quality':
          optimizedInput.needsCodeReview = true
          break
        case 'performance':
          optimizedInput.needsOptimization = true
          break
        case 'structure':
          optimizedInput.needsRefactoring = true
          break
      }
    }

    return optimizedInput
  }
}

/**
 * 反馈分析器
 */
export class FeedbackAnalyzer {
  /**
   * 分析反馈趋势
   */
  analyzeTrend(feedbacks: Feedback[]): {
    improving: boolean
    trend: 'up' | 'down' | 'stable'
    averageScore: number
  } {
    if (feedbacks.length < 2) {
      return { improving: false, trend: 'stable', averageScore: 0 }
    }

    const sortedFeedbacks = [...feedbacks].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    const firstHalf = sortedFeedbacks.slice(0, Math.floor(sortedFeedbacks.length / 2))
    const secondHalf = sortedFeedbacks.slice(Math.floor(sortedFeedbacks.length / 2))

    const firstAvg = firstHalf.reduce((s, f) => s + f.score, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((s, f) => s + f.score, 0) / secondHalf.length

    const improving = secondAvg > firstAvg
    const trend = secondAvg > firstAvg + 5 ? 'up' : secondAvg < firstAvg - 5 ? 'down' : 'stable'
    const averageScore = feedbacks.reduce((s, f) => s + f.score, 0) / feedbacks.length

    return { improving, trend, averageScore }
  }

  /**
   * 生成反馈报告
   */
  generateReport(feedbacks: Feedback[]): string {
    const trend = this.analyzeTrend(feedbacks)
    const byType = feedbacks.reduce((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let report = `反馈分析报告\n`
    report += `================\n\n`
    report += `总反馈数: ${feedbacks.length}\n`
    report += `平均分: ${trend.averageScore.toFixed(1)}\n`
    report += `趋势: ${trend.trend} (${trend.improving ? '改进中' : '需要关注'})\n\n`
    report += `按类型统计:\n`
    for (const [type, count] of Object.entries(byType)) {
      report += `  - ${type}: ${count}\n`
    }

    return report
  }
}
