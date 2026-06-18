/**
 * GET /api/conversations/:id/messages - 获取对话的消息历史
 *
 * 返回指定对话的所有消息，按时间正序排列
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAPIError } from '@/lib/errors'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 验证对话存在
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: '对话不存在' },
        { status: 404 }
      )
    }

    // 获取消息历史
    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json(messages)
  } catch (error) {
    const { message, statusCode } = handleAPIError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
