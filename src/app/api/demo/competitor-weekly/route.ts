import { runCompetitorWeeklyDemo } from '@/lib/demo-scenarios/competitor-weekly'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await runCompetitorWeeklyDemo({
      conversationId: stringValue(body.conversationId),
      userMessage: stringValue(body.userMessage) ?? '帮我把今天的竞品资料整理成周报草稿',
      evidenceIds: stringArray(body.evidenceIds),
      approved: body.approved === true,
    })

    return Response.json({ ok: true, data: result }, { status: 201 })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'competitor_weekly_demo_error',
          message: error instanceof Error ? error.message : 'Unable to run competitor weekly demo.',
        },
      },
      { status: 400 }
    )
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const strings = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  return strings.length ? strings : undefined
}
