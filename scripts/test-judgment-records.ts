import { createJudgmentRecord, listJudgmentRecords } from '@/lib/judgment/repository'

async function main() {
  console.log('=== 判断记录系统测试 ===\n')

  // 1. 创建测试判断记录
  console.log('1. 创建测试判断记录：')
  const record1 = await createJudgmentRecord({
    correlationId: 'test-correlation-1',
    taskId: 'test-task-1',
    judgmentType: 'route_to_agent',
    targetType: 'task',
    targetId: 'test-task-1',
    title: '路由到 Jobs Agent',
    reason: '用户请求创建产品需求文档，这是产品经理的专业领域',
    evidence: ['用户消息包含"产品需求文档"', 'Jobs Agent 负责产品相关任务'],
    confidence: 0.95,
    createdBy: 'route_engine',
  })
  console.log(`   ✅ 创建成功: ${record1.id}`)
  console.log(`   - 判断类型: ${record1.judgmentType}`)
  console.log(`   - 目标类型: ${record1.targetType}`)
  console.log(`   - 置信度: ${(record1.confidence * 100).toFixed(0)}%\n`)

  // 2. 创建第二个判断记录
  console.log('2. 创建第二个判断记录：')
  const record2 = await createJudgmentRecord({
    correlationId: 'test-correlation-2',
    taskId: 'test-task-2',
    judgmentType: 'allow_tool',
    targetType: 'tool_call',
    targetId: 'test-tool-call-1',
    title: '允许文件创建工具',
    reason: '用户请求创建文件，工具调用符合安全策略',
    evidence: ['用户明确请求创建文件', '工具在允许列表中'],
    confidence: 0.9,
    createdBy: 'tool_policy',
  })
  console.log(`   ✅ 创建成功: ${record2.id}`)
  console.log(`   - 判断类型: ${record2.judgmentType}`)
  console.log(`   - 目标类型: ${record2.targetType}\n`)

  // 3. 查询判断记录
  console.log('3. 查询判断记录：')
  const records = await listJudgmentRecords({ limit: 10 })
  console.log(`   ✅ 查询到 ${records.length} 条记录`)
  for (const record of records) {
    console.log(`   - ${record.title} (${record.judgmentType})`)
  }

  // 4. 按类型查询
  console.log('\n4. 按类型查询路由决策：')
  const routeDecisions = await listJudgmentRecords({ judgmentType: 'route_to_agent' })
  console.log(`   ✅ 查询到 ${routeDecisions.length} 条路由决策`)

  console.log('\n=== 测试完成 ===')
}

main().catch(console.error)
