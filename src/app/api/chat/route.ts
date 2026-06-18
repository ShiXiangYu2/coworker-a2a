/**
 * POST /api/chat - 发送消息并获取回复
 *
 * 支持两种模式：
 * 1. 单 Agent 模式：直接 LLM 流式回复
 * 2. 多 Agent 模式：CEO 分解 → 多 Agent 执行 → 汇总报告
 *
 * 请求体：
 * - conversationId?: string（可选，为空时自动创建新对话）
 * - message: string（必填）
 *
 * 响应：SSE 流式响应
 */

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getLLMProvider } from '@/lib/llm'
import { getSystemPrompt } from '@/lib/system-prompt'
import { handleAPIError } from '@/lib/errors'
import { routeMessageLLM } from '@/lib/agents/llm-router'
import { scheduleSubTasks } from '@/lib/agents/task-scheduler'
import { summarizeResults } from '@/lib/agents/result-summarizer'
import { executeAgentTask } from '@/lib/agents/task-executor'
import { reviewDeliverables } from '@/lib/agents/review-executor'
import type { ChatMessage } from '@/lib/llm'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, message } = body

    // 验证输入
    if (!message || typeof message !== 'string' || !message.trim()) {
      return new Response(
        JSON.stringify({ error: '请输入消息内容' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const trimmedMessage = message.trim()

    // 1. 处理对话（创建或查找）
    let convId = conversationId

    if (!convId) {
      const title = trimmedMessage.slice(0, 50) + (trimmedMessage.length > 50 ? '...' : '')
      const conversation = await prisma.conversation.create({
        data: { title },
      })
      convId = conversation.id
    } else {
      const existing = await prisma.conversation.findUnique({
        where: { id: convId },
      })
      if (!existing) {
        return new Response(
          JSON.stringify({ error: '对话不存在' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // 2. 存储 user message
    await prisma.message.create({
      data: {
        conversationId: convId,
        role: 'user',
        content: trimmedMessage,
        status: 'complete',
      },
    })

    // 3. 获取对话历史（最近 20 条）
    const history = await prisma.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const chatMessages: ChatMessage[] = history.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }))

    // 4. CEO 路由分析
    const decision = await routeMessageLLM({ message: trimmedMessage })

    // 5. 创建 SSE 流
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()
        let fullContent = ''
        let assistantMessageId = ''

        const sendEvent = (event: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        }

        try {
          sendEvent({ type: 'start', conversationId: convId })

          // === 多 Agent 模式 ===
          if (decision.decomposition && decision.decomposition.subtasks.length > 0) {
            const decomposition = decision.decomposition

            // 发送分解事件
            sendEvent({
              type: 'decomposition',
              reasoning: decomposition.reasoning,
              subtasks: decomposition.subtasks.map((st) => ({
                agentId: st.agentId,
                title: st.title,
                dependsOn: st.dependsOn,
              })),
            })

            // 执行子任务
            sendEvent({ type: 'agents_start', count: decomposition.subtasks.length })

            const { results } = await scheduleSubTasks(decomposition.subtasks, {
              message: trimmedMessage,
            })

            // 发送每个 Agent 的结果
            for (const result of results) {
              sendEvent({
                type: 'agent_result',
                agentId: result.agentId,
                agentName: result.agentName,
                title: result.title,
                status: result.status,
                confidence: result.confidence,
                summary: result.summary,
                findings: result.findings,
                durationMs: result.durationMs,
              })

              // Sprint 16: 发送交付物事件并保存到数据库
              if (result.deliverables && result.deliverables.length > 0) {
                sendEvent({
                  type: 'deliverable',
                  agentId: result.agentId,
                  agentName: result.agentName,
                  deliverables: result.deliverables,
                  summary: result.summary,
                  confidence: result.confidence,
                })

                // 保存交付物到数据库
                for (const d of result.deliverables) {
                  try {
                    await prisma.deliverable.create({
                      data: {
                        conversationId: convId,
                        agentId: result.agentId,
                        agentName: result.agentName,
                        taskTitle: result.title,
                        type: d.type,
                        title: d.title,
                        content: d.content,
                        format: d.format,
                        summary: result.summary,
                        confidence: result.confidence,
                      },
                    })
                  } catch (err) {
                    console.error('Failed to save deliverable:', err)
                  }
                }
              }
            }

            sendEvent({ type: 'agents_complete' })

            // 汇总结果
            sendEvent({ type: 'summarizing' })
            const report = await summarizeResults(trimmedMessage, results)
            fullContent = report

            // 逐字输出汇总报告（模拟流式）
            for (const char of report) {
              sendEvent({ type: 'delta', content: char })
            }
          } else if (
            decision.decisionType === 'delegate_to_agent' &&
            decision.targetAgentId &&
            decision.targetAgentId !== 'kelvin'
          ) {
            // === Sprint 17: 单 Agent 自动执行模式 ===
            // 路由到具体 Agent 时，自动执行并产出交付物

            sendEvent({
              type: 'route',
              decisionType: decision.decisionType,
              targetAgentId: decision.targetAgentId,
              confidence: decision.confidence,
              reason: decision.reason,
            })

            sendEvent({ type: 'agents_start', count: 1 })

            // 自动执行 Agent
            const result = await executeAgentTask(
              decision.targetAgentId,
              trimmedMessage
            )

            // 发送 Agent 结果
            sendEvent({
              type: 'agent_result',
              agentId: result.agentId,
              agentName: result.agentName,
              title: result.title,
              status: result.status,
              confidence: result.confidence,
              summary: result.summary,
              findings: result.findings,
              durationMs: result.durationMs,
            })

            // 发送交付物
            if (result.deliverables && result.deliverables.length > 0) {
              sendEvent({
                type: 'deliverable',
                agentId: result.agentId,
                agentName: result.agentName,
                deliverables: result.deliverables,
                summary: result.summary,
                confidence: result.confidence,
              })

              // 保存交付物到数据库
              for (const d of result.deliverables) {
                try {
                  await prisma.deliverable.create({
                    data: {
                      conversationId: convId,
                      agentId: result.agentId,
                      agentName: result.agentName,
                      taskTitle: result.title,
                      type: d.type,
                      title: d.title,
                      content: d.content,
                      format: d.format,
                      summary: result.summary,
                      confidence: result.confidence,
                    },
                  })
                } catch (err) {
                  console.error('Failed to save deliverable:', err)
                }
              }
            }

            // Sprint 20: 自动审查低置信度的 deliverables
            if (result.deliverables && result.deliverables.length > 0 && result.confidence < 0.85) {
              try {
                const reviews = await reviewDeliverables(result.deliverables, result.agentId)
                for (const review of reviews) {
                  sendEvent({
                    type: 'review',
                    review,
                  })
                }
              } catch (err) {
                console.error('Review failed:', err)
              }
            }

            sendEvent({ type: 'agents_complete' })

            // 使用 Agent 的 summary 作为回复
            fullContent = result.deliverables && result.deliverables.length > 0
              ? `**${result.agentName}** 已完成任务：${result.title}\n\n${result.summary}`
              : result.summary

            // 逐字输出
            for (const char of fullContent) {
              sendEvent({ type: 'delta', content: char })
            }
          } else {
            // === chat_only 模式（直接 LLM 回复） ===
            const provider = getLLMProvider()
            const systemPrompt = getSystemPrompt()

            sendEvent({
              type: 'route',
              decisionType: decision.decisionType,
              targetAgentId: decision.targetAgentId,
              confidence: decision.confidence,
              reason: decision.reason,
            })

            for await (const event of provider.streamChat(chatMessages, systemPrompt)) {
              if (event.type === 'delta') {
                fullContent += event.content
                sendEvent(event)
              } else if (event.type === 'error') {
                sendEvent(event)
              }
            }
          }

          // 6. 存储 assistant message
          if (fullContent) {
            const assistantMessage = await prisma.message.create({
              data: {
                conversationId: convId,
                role: 'assistant',
                content: fullContent,
                status: 'complete',
              },
            })
            assistantMessageId = assistantMessage.id
          }

          sendEvent({ type: 'done', messageId: assistantMessageId, conversationId: convId })
          controller.close()
        } catch (error) {
          console.error('Stream error:', error)

          if (fullContent) {
            const assistantMessage = await prisma.message.create({
              data: {
                conversationId: convId,
                role: 'assistant',
                content: fullContent,
                status: 'incomplete',
              },
            })
            assistantMessageId = assistantMessage.id
          }

          sendEvent({ type: 'error', error: '流式响应中断' })
          sendEvent({ type: 'done', messageId: assistantMessageId, conversationId: convId })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    const { message, statusCode } = handleAPIError(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
