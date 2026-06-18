/**
 * GET /api/conversations - 获取对话列表
 * POST /api/conversations - 创建新对话
 *
 * 返回按更新时间倒序排列的对话列表
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAPIError } from '@/lib/errors'

export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: { content: true, role: true },
        },
      },
    })

    return NextResponse.json(conversations)
  } catch (error) {
    const { message, statusCode } = handleAPIError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title } = body

    const conversationTitle = (typeof title === 'string' && title.trim())
      ? title.trim()
      : '新对话'

    const conversation = await prisma.conversation.create({
      data: { title: conversationTitle },
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    const { message, statusCode } = handleAPIError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
