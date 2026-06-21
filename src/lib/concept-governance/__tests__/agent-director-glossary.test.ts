import { describe, expect, it } from 'vitest'
import { buildAgentDirectorGlossarySeedRecords } from '../agent-director-glossary'

describe('agent director glossary seed records', () => {
  const records = buildAgentDirectorGlossarySeedRecords()

  it('contains exactly the phase 1 core glossary terms', () => {
    expect(records).toHaveLength(20)
    expect(records.map((record) => record.displayName)).toEqual([
      '智能体',
      '智能体循环',
      '可控性',
      '能力边界',
      '角色',
      '职责',
      '任务',
      '成功标准',
      '约束',
      '结构化输出',
      '规划',
      '任务分解',
      '路由',
      '工具调用',
      '记忆',
      '有效上下文',
      '多智能体',
      '任务交接',
      '评估',
      '护栏',
    ])
  })

  it('uses stable Feishu Base idempotency keys', () => {
    const keys = records.map((record) => record.idempotencyKey)
    expect(new Set(keys).size).toBe(records.length)
    expect(keys[0]).toBe('feishu-base:M9wGbk4jgatdLMsxSMJc9z8kneb:rec27Dmj9QGeFS')
    expect(keys.every((key) => key.startsWith('feishu-base:M9wGbk4jgatdLMsxSMJc9z8kneb:'))).toBe(true)
  })

  it('maps glossary fields into ConceptGlossary shape', () => {
    const guardrails = records.find((record) => record.displayName === '护栏')

    expect(guardrails).toMatchObject({
      conceptType: 'term',
      name: 'Guardrails',
      description: '对输入输出和工具调用设置的规则检查和阻断机制',
      examples: ['安全合规格式权限控制'],
      applicableTo: ['护栏', '安全', '产品化'],
      createdBy: 'seed:agent-director-glossary',
    })
    expect(guardrails?.definition).toMatchObject({
      englishTerm: 'Guardrails',
      category: '10 评估反馈与护栏',
      subcategory: '护栏',
      priority: '高',
      promptTemplate: '为【输入/输出/工具】设置【护栏规则】',
      tags: ['护栏', '安全', '产品化'],
      sourceSnapshot: {
        baseName: 'Agent编导词汇表_飞书导入版',
        baseToken: 'M9wGbk4jgatdLMsxSMJc9z8kneb',
        tableId: 'tbloRHAh8glyJ1kA',
        viewId: 'vew3B4faq1',
        recordId: 'rec27Dmj9QGtlX',
      },
    })
  })
})
