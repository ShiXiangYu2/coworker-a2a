/**
 * Agent Event Bus — 实时事件总线
 *
 * 基于发布-订阅模式的内存事件总线，用于 Agent 间实时通信。
 * 支持 SSE (Server-Sent Events) 推送。
 *
 * 核心事件：
 *   - agent.step_started: Agent 开始执行某步骤
 *   - agent.step_completed: Agent 完成某步骤
 *   - agent.step_failed: Agent 某步骤失败
 *   - agent.task_completed: Agent 完成整个任务
 *   - agent.tool_called: Agent 调用了工具
 *   - collaboration.message: Agent 间协作消息
 *   - orchestration.subtask_completed: 编排子任务完成
 *   - orchestration.replan: 编排重规划
 *
 * 安全：
 *   - 事件只在内存中，不持久化（适合实时通知）
 *   - SSE 连接有超时保护
 *   - 事件大小限制 10KB
 */

// ─── 类型定义 ──────────────────────────────────────────────────────

export type AgentEventType =
  | 'agent.step_started'
  | 'agent.step_completed'
  | 'agent.step_failed'
  | 'agent.task_completed'
  | 'agent.tool_called'
  | 'collaboration.message'
  | 'orchestration.subtask_completed'
  | 'orchestration.replan'

export interface AgentEvent {
  id: string
  type: AgentEventType
  timestamp: string
  agentId: string
  taskId?: string
  data: Record<string, unknown>
}

export type EventHandler = (event: AgentEvent) => void

// ─── 事件总线 ──────────────────────────────────────────────────────

const MAX_EVENT_SIZE = 10 * 1024 // 10KB
const MAX_SUBSCRIBERS = 100

let eventIdCounter = 0
const subscribers = new Map<string, Set<EventHandler>>()
const eventHistory: AgentEvent[] = []
const MAX_HISTORY = 200

/**
 * 发布事件
 *
 * 广播给所有匹配的订阅者。
 */
export function publishEvent(
  type: AgentEventType,
  agentId: string,
  data: Record<string, unknown>,
  taskId?: string,
): AgentEvent {
  const event: AgentEvent = {
    id: `evt-${++eventIdCounter}`,
    type,
    timestamp: new Date().toISOString(),
    agentId,
    taskId,
    data: sanitizeEventData(data),
  }

  // 保存到历史
  eventHistory.push(event)
  if (eventHistory.length > MAX_HISTORY) {
    eventHistory.shift()
  }

  // 广播给订阅者
  const handlers = subscribers.get(type)
  if (handlers) {
    for (const handler of handlers) {
      try {
        handler(event)
      } catch {
        // 订阅者错误不影响其他订阅者
      }
    }
  }

  // 也广播给通配符订阅者
  const wildcardHandlers = subscribers.get('*')
  if (wildcardHandlers) {
    for (const handler of wildcardHandlers) {
      try {
        handler(event)
      } catch {
        // 订阅者错误不影响其他订阅者
      }
    }
  }

  return event
}

/**
 * 订阅事件
 *
 * @param eventType 事件类型（'*' 表示所有事件）
 * @param handler 事件处理函数
 * @returns 取消订阅函数
 */
export function subscribeEvent(
  eventType: AgentEventType | '*',
  handler: EventHandler,
): () => void {
  if (!subscribers.has(eventType)) {
    subscribers.set(eventType, new Set())
  }

  const handlers = subscribers.get(eventType)!
  if (handlers.size >= MAX_SUBSCRIBERS) {
    console.warn(`[EventBus] Max subscribers (${MAX_SUBSCRIBERS}) reached for ${eventType}`)
  }

  handlers.add(handler)

  return () => {
    handlers.delete(handler)
    if (handlers.size === 0) {
      subscribers.delete(eventType)
    }
  }
}

/**
 * 获取事件历史
 *
 * @param options 过滤选项
 * @returns 最近的事件列表
 */
export function getEventHistory(options: {
  type?: AgentEventType
  agentId?: string
  taskId?: string
  limit?: number
  since?: string
} = {}): AgentEvent[] {
  const { type, agentId, taskId, limit = 50, since } = options

  let filtered = eventHistory

  if (type) {
    filtered = filtered.filter((e) => e.type === type)
  }
  if (agentId) {
    filtered = filtered.filter((e) => e.agentId === agentId)
  }
  if (taskId) {
    filtered = filtered.filter((e) => e.taskId === taskId)
  }
  if (since) {
    const sinceTime = new Date(since).getTime()
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() > sinceTime)
  }

  return filtered.slice(-limit)
}

/**
 * 获取订阅者数量（用于监控）
 */
export function getSubscriberCount(): number {
  let count = 0
  for (const handlers of subscribers.values()) {
    count += handlers.size
  }
  return count
}

/**
 * 清空事件历史（仅测试用）
 */
export function clearEventHistory(): void {
  eventHistory.length = 0
}

// ─── 辅助函数 ──────────────────────────────────────────────────────

function sanitizeEventData(data: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(data)
  if (json.length > MAX_EVENT_SIZE) {
    // 截断过大的事件数据
    return { _truncated: true, _originalSize: json.length, _preview: json.slice(0, 1000) }
  }
  return data
}

// ─── 便捷发布函数 ──────────────────────────────────────────────────

export function publishStepStarted(agentId: string, taskId: string, stepName: string): AgentEvent {
  return publishEvent('agent.step_started', agentId, { stepName }, taskId)
}

export function publishStepCompleted(agentId: string, taskId: string, stepName: string, result?: unknown): AgentEvent {
  return publishEvent('agent.step_completed', agentId, { stepName, result }, taskId)
}

export function publishStepFailed(agentId: string, taskId: string, stepName: string, error: string): AgentEvent {
  return publishEvent('agent.step_failed', agentId, { stepName, error }, taskId)
}

export function publishTaskCompleted(agentId: string, taskId: string, summary: string, confidence: number): AgentEvent {
  return publishEvent('agent.task_completed', agentId, { summary, confidence }, taskId)
}

export function publishToolCalled(agentId: string, taskId: string, toolName: string, success: boolean): AgentEvent {
  return publishEvent('agent.tool_called', agentId, { toolName, success }, taskId)
}

export function publishCollaborationMessage(fromAgentId: string, toAgentId: string, subject: string, taskId?: string): AgentEvent {
  return publishEvent('collaboration.message', fromAgentId, { toAgentId, subject }, taskId)
}

export function publishSubtaskCompleted(agentId: string, taskId: string, subtaskTitle: string, status: string): AgentEvent {
  return publishEvent('orchestration.subtask_completed', agentId, { subtaskTitle, status }, taskId)
}

export function publishReplan(agentId: string, taskId: string, reason: string, newSubtaskCount: number): AgentEvent {
  return publishEvent('orchestration.replan', agentId, { reason, newSubtaskCount }, taskId)
}
