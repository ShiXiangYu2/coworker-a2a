/**
 * Langfuse Integration — Langfuse 监控集成
 *
 * 将 Agent 执行数据发送到 Langfuse，支持：
 *   - LLM 调用追踪
 *   - Agent 执行追踪
 *   - 成本分析
 *   - 质量评估
 *
 * 配置：
 *   LANGFUSE_PUBLIC_KEY: Langfuse 公钥
 *   LANGFUSE_SECRET_KEY: Langfuse 密钥
 *   LANGFUSE_BASE_URL: Langfuse 地址（可选，默认 https://cloud.langfuse.com）
 */

// ─── 配置 ──────────────────────────────────────────────────────────

function getLangfuseConfig() {
  return {
    publicKey: process.env.LANGFUSE_PUBLIC_KEY ?? '',
    secretKey: process.env.LANGFUSE_SECRET_KEY ?? '',
    baseUrl: process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com',
  }
}

function isConfigured(): boolean {
  const config = getLangfuseConfig()
  return !!(config.publicKey && config.secretKey)
}

// ─── API 请求 ──────────────────────────────────────────────────────

async function langfuseFetch(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<{ status: number; data: unknown }> {
  const config = getLangfuseConfig()

  if (!config.publicKey || !config.secretKey) {
    throw new Error('Langfuse not configured')
  }

  const url = `${config.baseUrl}/api/public${path}`
  const auth = Buffer.from(`${config.publicKey}:${config.secretKey}`).toString('base64')

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  let data: unknown
  try {
    data = await response.json()
  } catch {
    data = null
  }

  return { status: response.status, data }
}

// ─── Trace 追踪 ────────────────────────────────────────────────────

export interface LangfuseTrace {
  id: string
  name: string
  metadata?: Record<string, unknown>
}

/**
 * 创建 Trace
 */
export async function createTrace(
  name: string,
  metadata?: Record<string, unknown>,
): Promise<LangfuseTrace | null> {
  if (!isConfigured()) return null

  try {
    const id = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await langfuseFetch('/traces', {
      method: 'POST',
      body: {
        id,
        name,
        metadata,
        timestamp: new Date().toISOString(),
      },
    })
    return { id, name, metadata }
  } catch {
    return null
  }
}

/**
 * 更新 Trace
 */
export async function updateTrace(
  traceId: string,
  updates: {
    metadata?: Record<string, unknown>
    output?: unknown
    level?: 'DEFAULT' | 'ERROR'
    statusMessage?: string
  },
): Promise<void> {
  if (!isConfigured()) return

  try {
    await langfuseFetch(`/traces/${traceId}`, {
      method: 'PATCH',
      body: updates,
    })
  } catch {
    // 忽略更新失败
  }
}

// ─── Generation 追踪 ───────────────────────────────────────────────

export interface LangfuseGeneration {
  id: string
  traceId: string
  name: string
  model: string
  usage?: {
    input: number
    output: number
    total: number
  }
}

/**
 * 创建 Generation（LLM 调用追踪）
 */
export async function createGeneration(
  traceId: string,
  name: string,
  model: string,
  input?: unknown,
  usage?: { input: number; output: number; total: number },
): Promise<LangfuseGeneration | null> {
  if (!isConfigured()) return null

  try {
    const id = `gen-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await langfuseFetch('/generations', {
      method: 'POST',
      body: {
        id,
        traceId,
        name,
        model,
        input,
        usage,
        startTime: new Date().toISOString(),
      },
    })
    return { id, traceId, name, model, usage }
  } catch {
    return null
  }
}

/**
 * 更新 Generation
 */
export async function updateGeneration(
  generationId: string,
  updates: {
    output?: unknown
    usage?: { input: number; output: number; total: number }
    level?: 'DEFAULT' | 'ERROR'
    statusMessage?: string
    endTime?: string
  },
): Promise<void> {
  if (!isConfigured()) return

  try {
    await langfuseFetch(`/generations/${generationId}`, {
      method: 'PATCH',
      body: {
        ...updates,
        endTime: updates.endTime ?? new Date().toISOString(),
      },
    })
  } catch {
    // 忽略更新失败
  }
}

// ─── Event 追踪 ────────────────────────────────────────────────────

/**
 * 创建 Event
 */
export async function createEvent(
  traceId: string,
  name: string,
  input?: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isConfigured()) return

  try {
    await langfuseFetch('/events', {
      method: 'POST',
      body: {
        traceId,
        name,
        input,
        metadata,
        timestamp: new Date().toISOString(),
      },
    })
  } catch {
    // 忽略事件失败
  }
}

// ─── 便捷函数 ──────────────────────────────────────────────────────

/**
 * 追踪 LLM 调用
 */
export async function traceLLMCall(
  traceId: string,
  model: string,
  input: unknown,
  output: unknown,
  usage: { input: number; output: number; total: number },
): Promise<void> {
  const gen = await createGeneration(traceId, 'llm-call', model, input, usage)
  if (gen) {
    await updateGeneration(gen.id, { output, usage })
  }
}

/**
 * 追踪 Agent 执行
 */
export async function traceAgentRun(
  agentId: string,
  taskId: string,
  input: unknown,
  output: unknown,
  durationMs: number,
): Promise<void> {
  const trace = await createTrace(`agent-run:${agentId}`, {
    agentId,
    taskId,
    durationMs,
  })

  if (trace) {
    await updateTrace(trace.id, {
      output,
      metadata: { durationMs },
    })
  }
}

/**
 * 获取 Langfuse 状态
 */
export function getLangfuseStatus(): {
  configured: boolean
  baseUrl: string
} {
  const config = getLangfuseConfig()
  return {
    configured: isConfigured(),
    baseUrl: config.baseUrl,
  }
}
