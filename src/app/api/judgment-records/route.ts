import { NextRequest } from 'next/server'
import { listJudgmentRecords, createJudgmentRecord } from '@/lib/judgment/repository'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId') ?? undefined
    const judgmentType = url.searchParams.get('judgmentType') ?? undefined
    const targetType = url.searchParams.get('targetType') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined

    const records = await listJudgmentRecords({
      taskId,
      judgmentType,
      targetType,
      status,
      limit,
    })

    return Response.json({ ok: true, data: records })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list judgment records'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const record = await createJudgmentRecord(body)

    return Response.json({ ok: true, data: record }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create judgment record'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
