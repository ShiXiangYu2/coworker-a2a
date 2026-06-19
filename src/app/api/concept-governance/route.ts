import { NextRequest } from 'next/server'
import { listConceptGlossary, createConceptGlossary } from '@/lib/concept-governance/repository'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const conceptType = url.searchParams.get('conceptType') ?? undefined
    const status = url.searchParams.get('status') ?? undefined
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined

    const concepts = await listConceptGlossary({
      conceptType,
      status,
      limit,
    })

    return Response.json({ ok: true, data: concepts })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list concepts'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const concept = await createConceptGlossary(body)

    return Response.json({ ok: true, data: concept }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create concept'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
