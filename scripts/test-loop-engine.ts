import { LoopEngine } from '@/lib/loop-engine/engine'
import { AutomationPipelineManager, PREDEFINED_PIPELINES } from '@/lib/loop-engine/automation'
import { DefaultFeedbackCollector, DefaultOptimizationEngine, FeedbackAnalyzer } from '@/lib/loop-engine/feedback'

async function main() {
  console.log('=== 循环执行引擎测试 ===\n')

  // 测试 1: 循环执行引擎
  console.log('测试 1: 循环执行引擎')
  const loopEngine = new LoopEngine({ maxIterations: 3 })

  const loopResult = await loopEngine.startLoop(
    {
      requirement: '创建一个用户登录功能',
      language: 'typescript',
    },
    ['requirement_analysis', 'code_generation', 'testing']
  )

  console.log(`   迭代次数: ${loopResult.iterations.length}`)
  console.log(`   状态: ${loopResult.status}`)
  console.log(`   平均分: ${loopResult.metrics.averageScore.toFixed(1)}`)
  console.log(`   成功率: ${loopResult.metrics.successRate.toFixed(1)}%`)
  console.log('')

  // 测试 2: 自动化流水线
  console.log('测试 2: 自动化流水线')
  const pipelineManager = new AutomationPipelineManager()

  // 创建流水线
  const pipeline = pipelineManager.createPipeline(
    '测试流水线',
    PREDEFINED_PIPELINES.rapidPrototype.steps
  )
  console.log(`   创建流水线: ${pipeline.name} (${pipeline.steps.length} 步骤)`)

  // 执行流水线
  const pipelineResult = await pipelineManager.executePipeline(pipeline.id, {
    requirement: '创建一个 API 接口',
    language: 'typescript',
  })
  console.log(`   执行完成`)
  console.log('')

  // 测试 3: 反馈收集
  console.log('测试 3: 反馈收集')
  const feedbackCollector = new DefaultFeedbackCollector()

  const feedbacks = await feedbackCollector.collectTestResults(loopResult.iterations[0])
  console.log(`   收集到 ${feedbacks.length} 条反馈`)
  feedbacks.forEach(f => {
    console.log(`     - ${f.type}: ${f.content} (分数: ${f.score})`)
  })
  console.log('')

  // 测试 4: 优化建议
  console.log('测试 4: 优化建议')
  const optimizationEngine = new DefaultOptimizationEngine()

  const suggestions = await optimizationEngine.analyzeFeedback(feedbacks)
  console.log(`   生成 ${suggestions.length} 条优化建议`)
  suggestions.forEach(s => {
    console.log(`     - [${s.type}] ${s.description} (影响: ${s.impact}, 优先级: ${s.priority})`)
  })
  console.log('')

  // 测试 5: 反馈分析
  console.log('测试 5: 反馈分析')
  const feedbackAnalyzer = new FeedbackAnalyzer()

  const allFeedbacks = loopResult.iterations.flatMap(i => i.feedback)
  const trend = feedbackAnalyzer.analyzeTrend(allFeedbacks)
  console.log(`   趋势: ${trend.trend}`)
  console.log(`   改进中: ${trend.improving}`)
  console.log(`   平均分: ${trend.averageScore.toFixed(1)}`)

  const report = feedbackAnalyzer.generateReport(allFeedbacks)
  console.log(`   报告:\n${report.split('\n').map(l => `     ${l}`).join('\n')}`)
  console.log('')

  console.log('=== 测试完成 ===')
}

main().catch(console.error)
