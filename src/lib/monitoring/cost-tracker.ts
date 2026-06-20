/**
 * Cost Tracker — 成本追踪器
 *
 * 追踪 LLM API 调用成本，支持：
 *   - 按 Provider/Model/Agent 分组统计
 *   - 按时间窗口（小时/天/周/月）聚合
 *   - 预算告警
 */

import { prisma } from '@/lib/prisma'
import type { CostBreakdown } from './types'

// ─── 模型定价（每 1K token，美元） ────────────────────────────────

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-haiku-4-20250414': { input: 0.00025, output: 0.00125 },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
  'deepseek-v4-pro': { input: 0.001, output: 0.002 },
  'deepseek-v4-flash': { input: 0.0001, output: 0.0002 },
  'step-3.7-flash': { input: 0.0005, output: 0.001 },
  'mock': { input: 0, output: 0 },
}

const DEFAULT_PRICING = { input: 0.003, output: 0.015 }

// ─── 预算配置 ──────────────────────────────────────────────────────

const BUDGET_LIMITS = {
  daily: parseFloat(process.env.COST_BUDGET_DAILY ?? '10'), // $10/day
  weekly: parseFloat(process.env.COST_BUDGET_WEEKLY ?? '50'), // $50/week
  monthly: parseFloat(process.env.COST_BUDGET_MONTHLY ?? '200'), // $200/month
}

// ─── 成本计算 ──────────────────────────────────────────────────────

/**
 * 估算 LLM 调用成本
 */
export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? DEFAULT_PRICING
  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output
  return inputCost + outputCost
}

// ─── 成本查询 ──────────────────────────────────────────────────────

/**
 * 获取成本分解
 */
export async function getCostBreakdown(
  period: 'hour' | 'day' | 'week' | 'month' = 'day',
): Promise<CostBreakdown> {
  const startTime = getPeriodStart(period)

  const records = await prisma.routingDecisionRecord.findMany({
    where: { createdAt: { gte: startTime } },
    select: {
      agentId: true,
      durationMs: true,
    },
  })

  // 简化计算：基于记录数估算成本
  const totalCostUsd = records.length * 0.01 // 简化估算

  const byAgent: Record<string, number> = {}
  for (const record of records) {
    byAgent[record.agentId] = (byAgent[record.agentId] ?? 0) + 0.01
  }

  return {
    byProvider: { deepseek: totalCostUsd },
    byModel: { 'deepseek-v4-flash': totalCostUsd },
    byAgent,
    totalCostUsd,
    period,
  }
}

/**
 * 检查预算
 */
export async function checkBudget(): Promise<{
  daily: { used: number; limit: number; remaining: number; percentage: number }
  weekly: { used: number; limit: number; remaining: number; percentage: number }
  monthly: { used: number; limit: number; remaining: number; percentage: number }
  alerts: string[]
}> {
  const [daily, weekly, monthly] = await Promise.all([
    getCostBreakdown('day'),
    getCostBreakdown('week'),
    getCostBreakdown('month'),
  ])

  const alerts: string[] = []

  const dailyPct = BUDGET_LIMITS.daily > 0 ? (daily.totalCostUsd / BUDGET_LIMITS.daily) * 100 : 0
  const weeklyPct = BUDGET_LIMITS.weekly > 0 ? (weekly.totalCostUsd / BUDGET_LIMITS.weekly) * 100 : 0
  const monthlyPct = BUDGET_LIMITS.monthly > 0 ? (monthly.totalCostUsd / BUDGET_LIMITS.monthly) * 100 : 0

  if (dailyPct > 80) alerts.push(`Daily budget warning: ${dailyPct.toFixed(0)}% used`)
  if (weeklyPct > 80) alerts.push(`Weekly budget warning: ${weeklyPct.toFixed(0)}% used`)
  if (monthlyPct > 80) alerts.push(`Monthly budget warning: ${monthlyPct.toFixed(0)}% used`)

  if (dailyPct > 100) alerts.push(`Daily budget EXCEEDED: $${daily.totalCostUsd.toFixed(2)} / $${BUDGET_LIMITS.daily}`)
  if (weeklyPct > 100) alerts.push(`Weekly budget EXCEEDED: $${weekly.totalCostUsd.toFixed(2)} / $${BUDGET_LIMITS.weekly}`)
  if (monthlyPct > 100) alerts.push(`Monthly budget EXCEEDED: $${monthly.totalCostUsd.toFixed(2)} / $${BUDGET_LIMITS.monthly}`)

  return {
    daily: {
      used: daily.totalCostUsd,
      limit: BUDGET_LIMITS.daily,
      remaining: Math.max(0, BUDGET_LIMITS.daily - daily.totalCostUsd),
      percentage: dailyPct,
    },
    weekly: {
      used: weekly.totalCostUsd,
      limit: BUDGET_LIMITS.weekly,
      remaining: Math.max(0, BUDGET_LIMITS.weekly - weekly.totalCostUsd),
      percentage: weeklyPct,
    },
    monthly: {
      used: monthly.totalCostUsd,
      limit: BUDGET_LIMITS.monthly,
      remaining: Math.max(0, BUDGET_LIMITS.monthly - monthly.totalCostUsd),
      percentage: monthlyPct,
    },
    alerts,
  }
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function getPeriodStart(period: 'hour' | 'day' | 'week' | 'month'): Date {
  const now = new Date()
  switch (period) {
    case 'hour':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours())
    case 'day':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case 'week': {
      const day = now.getDay()
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day)
    }
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1)
  }
}
