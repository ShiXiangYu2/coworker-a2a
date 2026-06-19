import { NextRequest } from 'next/server'
import { listGovernanceDebts, createGovernanceDebt, getGovernanceDebtStats } from '@/lib/governance-debt/repository'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId') ?? undefined
    const debtType = url.searchParams.get('debtType') ?? undefined
    const severity = url.searchParams.get('severity') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined

    // 如果请求统计信息
    if (url.searchParams.get('stats') === 'true') {
      const stats = await getGovernanceDebtStats()
      return Response.json({ ok: true, data: stats })
    }

    const debts = await listGovernanceDebts({
      taskId,
      debtType,
      severity,
      status,
      limit,
    })

    return Response.json({ ok: true, data: debts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list governance debts'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const debt = await createGovernanceDebt(body)

    return Response.json({ ok: true, data: debt }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create governance debt'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
