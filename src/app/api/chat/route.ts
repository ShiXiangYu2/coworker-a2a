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
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getLLMProvider } from '@/lib/llm'
import { getSystemPrompt } from '@/lib/system-prompt'
import { handleAPIError } from '@/lib/errors'
import { routeMessageLLM } from '@/lib/agents/llm-router'
import { scheduleSubTasks } from '@/lib/agents/task-scheduler'
import { summarizeResults } from '@/lib/agents/result-summarizer'
import { reviewDeliverables } from '@/lib/agents/review-executor'
import { executeRecordedAgentTask } from '@/lib/agents/recorded-task-executor'
import {
  createRunRequestRecord,
  updateRunRequestRecordStatus,
} from '@/lib/run-requests/repository'
import type { ChatMessage } from '@/lib/llm'

export async function POST(request: NextRequest) {
  let runCorrelationId: string | null = null
  let runRequestRecordId: string | null = null

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
    const correlationId = `chathub-${randomUUID()}`
    runCorrelationId = correlationId
    const runRequest = await createRunRequestRecord({
      correlationId,
      source: 'chathub',
      userMessage: trimmedMessage,
      orchestrator: 'route_engine',
      metadata: { conversationId: conversationId ?? null },
    })
    runRequestRecordId = runRequest.record.id
    await createChatHubAuditEvent({
      correlationId,
      eventType: 'chathub.request_received',
      reason: 'ChatHub received a valid user request.',
      payload: {
        runRequestRecordId,
        conversationId: conversationId ?? null,
      },
    })

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
        await updateRunRequestRecordStatus({
          correlationId,
          status: 'failed',
          reason: 'ChatHub request referenced a missing conversation.',
          metadata: { conversationId: convId },
        })
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
    await updateRunRequestRecordStatus({
      correlationId,
      status: 'running',
      reason: 'ChatHub route decision completed and response generation started.',
      metadata: {
        conversationId: convId,
        decisionType: decision.decisionType,
        targetAgentId: decision.targetAgentId ?? null,
      },
    })
    await createChatHubAuditEvent({
      correlationId,
      eventType: 'chathub.route_decided',
      reason: 'ChatHub route engine selected the response path.',
      payload: {
        runRequestRecordId: runRequest.record.id,
        conversationId: convId,
        decisionType: decision.decisionType,
        targetAgentId: decision.targetAgentId ?? null,
        confidence: decision.confidence,
      },
    })

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
          sendEvent({
            type: 'start',
            conversationId: convId,
            correlationId,
            runRequestRecordId: runRequest.record.id,
          })

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
              correlationId,
              orchestrator: 'route_engine',
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
                agentTaskRunRecordId: result.agentTaskRunRecordId,
                blockedToolRequests: result.blockedToolRequests,
                requiresApproval: result.requiresApproval,
                proposedActionSummary: result.proposedActionSummary,
                executionIntentRecordId: result.executionIntentRecordId,
                executionPlanRecordId: result.executionPlanRecordId,
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
            const result = await executeRecordedAgentTask({
              correlationId,
              orchestrator: 'route_engine',
              agentId: decision.targetAgentId,
              taskId: 'chathub-single-agent',
              taskType: 'chat_single_agent',
              taskDescription: trimmedMessage,
              input: {
                message: trimmedMessage,
                decisionType: decision.decisionType,
                targetAgentId: decision.targetAgentId,
              },
            })

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
              agentTaskRunRecordId: result.agentTaskRunRecordId,
              blockedToolRequests: result.blockedToolRequests,
              requiresApproval: result.requiresApproval,
              proposedActionSummary: result.proposedActionSummary,
              executionIntentRecordId: result.executionIntentRecordId,
              executionPlanRecordId: result.executionPlanRecordId,
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

          await updateRunRequestRecordStatus({
            correlationId,
            status: 'succeeded',
            reason: 'ChatHub response completed successfully.',
            metadata: {
              conversationId: convId,
              messageId: assistantMessageId,
              decisionType: decision.decisionType,
              targetAgentId: decision.targetAgentId ?? null,
            },
          })
          await createChatHubAuditEvent({
            correlationId,
            eventType: 'chathub.response_completed',
            reason: 'ChatHub streamed the response to completion.',
            payload: {
              runRequestRecordId: runRequest.record.id,
              conversationId: convId,
              messageId: assistantMessageId,
            },
          })

          sendEvent({
            type: 'done',
            messageId: assistantMessageId,
            conversationId: convId,
            correlationId,
            runRequestRecordId: runRequest.record.id,
          })
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

          await updateRunRequestRecordStatus({
            correlationId,
            status: 'failed',
            reason: error instanceof Error ? error.message : 'ChatHub streaming response failed.',
            metadata: {
              conversationId: convId,
              messageId: assistantMessageId || null,
              decisionType: decision.decisionType,
              targetAgentId: decision.targetAgentId ?? null,
            },
          })
          await createChatHubAuditEvent({
            correlationId,
            eventType: 'chathub.response_failed',
            reason: error instanceof Error ? error.message : 'ChatHub streaming response failed.',
            payload: {
              runRequestRecordId: runRequest.record.id,
              conversationId: convId,
              messageId: assistantMessageId || null,
            },
          })

          sendEvent({ type: 'error', error: '流式响应中断' })
          sendEvent({
            type: 'done',
            messageId: assistantMessageId,
            conversationId: convId,
            correlationId,
            runRequestRecordId: runRequest.record.id,
          })
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
    if (runCorrelationId) {
      const reason = error instanceof Error ? error.message : 'ChatHub request failed before streaming.'
      try {
        await updateRunRequestRecordStatus({
          correlationId: runCorrelationId,
          status: 'failed',
          reason,
          metadata: { runRequestRecordId },
        })
        await createChatHubAuditEvent({
          correlationId: runCorrelationId,
          eventType: 'chathub.response_failed',
          reason,
          payload: { runRequestRecordId },
        })
      } catch (auditError) {
        console.error('Failed to mark ChatHub run request as failed:', auditError)
      }
    }

    const { message, statusCode } = handleAPIError(error)
    return new Response(
      JSON.stringify({ error: message }),
      { status: statusCode, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function createChatHubAuditEvent(args: {
  correlationId: string
  eventType: string
  reason: string
  payload?: unknown
}) {
  return prisma.harmonyAuditEvent.create({
    data: {
      correlationId: args.correlationId,
      eventType: args.eventType,
      actorType: 'chathub',
      reason: args.reason,
      payloadJson: args.payload === undefined ? null : JSON.stringify(args.payload),
    },
  })
}
