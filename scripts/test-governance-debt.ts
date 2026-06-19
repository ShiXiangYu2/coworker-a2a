import { createGovernanceDebt, listGovernanceDebts, getGovernanceDebtStats } from '@/lib/governance-debt/repository'

async function main() {
  console.log('=== 治理债务系统测试 ===\n')

  // 1. 创建测试治理债务
  console.log('1. 创建测试治理债务：')
  const debt1 = await createGovernanceDebt({
    correlationId: 'test-correlation-1',
    taskId: 'test-task-1',
    debtType: 'drift',
    severity: 'high',
    title: 'Agent 路由决策漂移',
    description: 'Agent 路由决策与用户意图不匹配，导致任务分配错误',
    source: 'eval',
    evidence: ['Eval 发现路由准确率下降到 85%', '最近 10 次路由中有 2 次错误'],
    blocksExecution: true,
    createdBy: 'eval_system',
  })
  console.log(`   ✅ 创建成功: ${debt1.id}`)
  console.log(`   - 债务类型: ${debt1.debtType}`)
  console.log(`   - 严重度: ${debt1.severity}`)
  console.log(`   - 阻塞执行: ${debt1.blocksExecution}\n`)

  // 2. 创建第二个治理债务
  console.log('2. 创建第二个治理债务：')
  const debt2 = await createGovernanceDebt({
    correlationId: 'test-correlation-2',
    taskId: 'test-task-2',
    debtType: 'prompt_quality',
    severity: 'medium',
    title: '提示词质量不足',
    description: '某些 Agent 的提示词质量不足，导致输出结果不准确',
    source: 'review',
    evidence: ['审查发现提示词缺少关键约束', '输出结果与预期不符'],
    blocksExecution: false,
    createdBy: 'review_system',
  })
  console.log(`   ✅ 创建成功: ${debt2.id}`)
  console.log(`   - 债务类型: ${debt2.debtType}`)
  console.log(`   - 严重度: ${debt2.severity}\n`)

  // 3. 查询治理债务
  console.log('3. 查询治理债务：')
  const debts = await listGovernanceDebts({ limit: 10 })
  console.log(`   ✅ 查询到 ${debts.length} 条记录`)
  for (const debt of debts) {
    console.log(`   - ${debt.title} (${debt.debtType}) [${debt.severity}]`)
  }

  // 4. 获取统计信息
  console.log('\n4. 获取统计信息：')
  const stats = await getGovernanceDebtStats()
  console.log(`   ✅ 总债务数: ${stats.total}`)
  console.log(`   - 待解决: ${stats.open}`)
  console.log(`   - 阻塞执行: ${stats.blocking}`)
  console.log(`   - 按严重度: ${JSON.stringify(stats.bySeverity)}`)
  console.log(`   - 按类型: ${JSON.stringify(stats.byType)}`)

  console.log('\n=== 测试完成 ===')
}

main().catch(console.error)
