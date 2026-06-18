/**
 * GET /api/conversations - 获取对话列表
 *
 * 返回按更新时间倒序排列的对话列表
 */

import { NextResponse } from 'next/server'
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
