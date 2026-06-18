/**
 * GET /api/conversations/:id/tasks - 获取对话关联的所有 HarmonyTask
 *
 * 返回按创建时间倒序排列的任务列表，包含 AgentStep 步骤信息
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { handleAPIError } from '@/lib/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 验证对话存在
    const conversation = await prisma.conversation.findUnique({
      where: { id },
    })

    if (!conversation) {
      return NextResponse.json({ error: '对话不存在' }, { status: 404 })
    }

    // 获取关联的 HarmonyTask，包含步骤信息
    const tasks = await prisma.harmonyTask.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        agentSteps: {
          orderBy: { index: 'asc' },
          select: {
            id: true,
            agentId: true,
            index: true,
            kind: true,
            status: true,
            summary: true,
            createdAt: true,
          },
        },
      },
    })

    return NextResponse.json({ data: tasks })
  } catch (error) {
    const { message, statusCode } = handleAPIError(error)
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
