import { createConceptGlossary, listConceptGlossary } from '@/lib/concept-governance/repository'

async function main() {
  console.log('=== 概念治理系统测试 ===\n')

  // 1. 创建测试概念 - 术语
  console.log('1. 创建测试概念（术语）：')
  const concept1 = await createConceptGlossary({
    conceptType: 'term',
    name: 'agent_run',
    displayName: 'Agent 运行',
    description: 'Agent 执行任务的完整过程，从接收到完成',
    definition: {
      input: '任务描述和上下文',
      output: '执行结果和交付物',
      lifecycle: 'queued -> running -> completed/failed',
    },
    applicableTo: ['task', 'workflow', 'runtime'],
    examples: ['Jobs Agent 执行产品需求分析', 'Linus Agent 执行代码编写'],
    createdBy: 'system',
  })
  console.log(`   ✅ 创建成功: ${concept1.id}`)
  console.log(`   - 概念类型: ${concept1.conceptType}`)
  console.log(`   - 名称: ${concept1.name}\n`)

  // 2. 创建测试概念 - 风险分类
  console.log('2. 创建测试概念（风险分类）：')
  const concept2 = await createConceptGlossary({
    conceptType: 'risk_classification',
    name: 'tool_risk_levels',
    displayName: '工具风险等级',
    description: '工具调用的风险等级分类',
    definition: {
      low: '无副作用，可随时执行',
      medium: '有副作用，需要确认',
      high: '有破坏性副作用，需要人工审批',
      critical: '有严重副作用，需要多级审批',
    },
    applicableTo: ['tool_call', 'execution'],
    examples: ['读取文件（低风险）', '写入文件（中风险）', '删除文件（高风险）'],
    createdBy: 'system',
  })
  console.log(`   ✅ 创建成功: ${concept2.id}`)
  console.log(`   - 概念类型: ${concept2.conceptType}`)
  console.log(`   - 名称: ${concept2.name}\n`)

  // 3. 创建测试概念 - 生命周期阶段
  console.log('3. 创建测试概念（生命周期阶段）：')
  const concept3 = await createConceptGlossary({
    conceptType: 'lifecycle_phase',
    name: 'six_phase_lifecycle',
    displayName: '六阶段生命周期',
    description: '任务的六阶段主生命周期',
    definition: {
      intake: '接收用户需求',
      consensus: '需求澄清和确认',
      planning: '制定执行计划',
      execution: '执行任务',
      review: '审查执行结果',
      repair: '修复问题',
    },
    applicableTo: ['task', 'workflow'],
    examples: ['用户发送需求 -> intake', 'Agent 执行任务 -> execution'],
    createdBy: 'system',
  })
  console.log(`   ✅ 创建成功: ${concept3.id}`)
  console.log(`   - 概念类型: ${concept3.conceptType}`)
  console.log(`   - 名称: ${concept3.name}\n`)

  // 4. 查询概念
  console.log('4. 查询概念：')
  const concepts = await listConceptGlossary({ limit: 10 })
  console.log(`   ✅ 查询到 ${concepts.length} 个概念`)
  for (const concept of concepts) {
    console.log(`   - ${concept.displayName} (${concept.conceptType})`)
  }

  // 5. 按类型查询
  console.log('\n5. 按类型查询术语：')
  const terms = await listConceptGlossary({ conceptType: 'term' })
  console.log(`   ✅ 查询到 ${terms.length} 个术语`)

  console.log('\n=== 测试完成 ===')
}

main().catch(console.error)
