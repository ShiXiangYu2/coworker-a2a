/**
 * 数据库种子数据
 *
 * 预置 DepartmentProfile + DepartmentAgentRole 记录，
 * 对应 THE TEAM 角色：Jobs（产品）、Linus（工程）、Turing（验证）、Bezos（客户）
 *
 * 运行：npx prisma db seed
 */

import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const correlationId = randomUUID()

const departments = [
  {
    departmentKey: 'jobs',
    displayName: 'Jobs — Product Department',
    profileKind: 'product',
    mission: '负责需求分析、PRD 生成、用户画像、产品体验设计',
    responsibilitySummary: 'Clarify requirements, write PRDs and user stories, define product experience and acceptance criteria.',
    roles: [
      {
        roleKey: 'jobs',
        displayName: 'Jobs (Product Agent)',
        roleMission: 'Clarify requirements, write PRDs and user stories, define product experience and acceptance criteria.',
        seniority: 'lead',
        allowedLocalActionsJson: JSON.stringify([
          'analyze_requirements',
          'write_prd',
          'define_user_stories',
          'create_prototype',
          'review_ui',
        ]),
        deniedRuntimeActionsJson: JSON.stringify([
          'execute_code',
          'deploy',
          'run_tests',
          'modify_database',
        ]),
      },
    ],
  },
  {
    departmentKey: 'linus',
    displayName: 'Linus — Engineering Department',
    profileKind: 'engineering',
    mission: '负责代码实现、技术方案、架构设计、数据库设计',
    responsibilitySummary: 'Design technical architecture, plan APIs and databases, implement and refactor code.',
    roles: [
      {
        roleKey: 'linus',
        displayName: 'Linus (Engineering Agent)',
        roleMission: 'Design technical architecture, plan APIs and databases, implement and refactor code.',
        seniority: 'lead',
        allowedLocalActionsJson: JSON.stringify([
          'design_architecture',
          'write_code',
          'design_api',
          'design_database',
          'refactor',
          'run_tdd',
        ]),
        deniedRuntimeActionsJson: JSON.stringify([
          'deploy',
          'publish',
          'modify_production',
        ]),
      },
    ],
  },
  {
    departmentKey: 'turing',
    displayName: 'Turing — Verification Department',
    profileKind: 'verification',
    mission: '负责测试、质量保障、正确性验证、Bug 诊断',
    responsibilitySummary: 'Design tests and evals, diagnose failures, review correctness and quality.',
    roles: [
      {
        roleKey: 'turing',
        displayName: 'Turing (Verification Agent)',
        roleMission: 'Design tests and evals, diagnose failures, review correctness and quality.',
        seniority: 'lead',
        allowedLocalActionsJson: JSON.stringify([
          'design_tests',
          'run_eval',
          'review_code',
          'diagnose_failure',
          'check_quality',
        ]),
        deniedRuntimeActionsJson: JSON.stringify([
          'deploy',
          'modify_production',
          'write_feature_code',
        ]),
      },
    ],
  },
  {
    departmentKey: 'bezos',
    displayName: 'Bezos — Customer Department',
    profileKind: 'customer',
    mission: '负责客户反馈、市场洞察、用户体验闭环、商业价值评估',
    responsibilitySummary: 'Analyze customer feedback, assess market and competitor signals, prioritize business value.',
    roles: [
      {
        roleKey: 'bezos',
        displayName: 'Bezos (Customer Agent)',
        roleMission: 'Analyze customer feedback, assess market and competitor signals, prioritize business value.',
        seniority: 'lead',
        allowedLocalActionsJson: JSON.stringify([
          'analyze_feedback',
          'assess_market',
          'evaluate_business_value',
          'prioritize_growth',
        ]),
        deniedRuntimeActionsJson: JSON.stringify([
          'execute_code',
          'deploy',
          'modify_database',
          'write_code',
        ]),
      },
    ],
  },
]

async function main() {
  console.log('🌱 Seeding department profiles...')

  for (const dept of departments) {
    const profile = await prisma.departmentProfile.upsert({
      where: { id: dept.departmentKey },
      update: {
        displayName: dept.displayName,
        profileKind: dept.profileKind,
        mission: dept.mission,
        responsibilitySummary: dept.responsibilitySummary,
        status: 'active',
      },
      create: {
        id: dept.departmentKey,
        departmentKey: dept.departmentKey,
        displayName: dept.displayName,
        profileKind: dept.profileKind,
        mission: dept.mission,
        responsibilitySummary: dept.responsibilitySummary,
        status: 'active',
        safetyNote: 'Local department profile only. No runtime routing or execution permission.',
        createdBy: 'seed',
        correlationId,
      },
    })

    for (const role of dept.roles) {
      await prisma.departmentAgentRole.upsert({
        where: { id: role.roleKey },
        update: {
          displayName: role.displayName,
          roleMission: role.roleMission,
          seniority: role.seniority,
          allowedLocalActionsJson: role.allowedLocalActionsJson,
          deniedRuntimeActionsJson: role.deniedRuntimeActionsJson,
          status: 'active',
        },
        create: {
          id: role.roleKey,
          roleKey: role.roleKey,
          displayName: role.displayName,
          roleMission: role.roleMission,
          seniority: role.seniority,
          departmentProfileId: profile.id,
          status: 'active',
          allowedLocalActionsJson: role.allowedLocalActionsJson,
          deniedRuntimeActionsJson: role.deniedRuntimeActionsJson,
          createdBy: 'seed',
          correlationId,
        },
      })
    }

    console.log(`  ✅ ${dept.displayName} (roles: ${dept.roles.map((r) => r.roleKey).join(', ')})`)
  }

  console.log('🌱 Seeding complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
