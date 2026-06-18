/**
 * Minimal Tool Runtime
 *
 * Provides safe, read-only tool execution for Agent Loops.
 * Currently supports only `read.project_context` (reads from ContextPacket).
 */

import type { ToolResult } from '@/lib/tools/types'

export type ToolRuntimeToolName = 'read.project_context'

export interface ToolRuntimeContext {
  contextPacket?: {
    items?: Array<{ type: string; content: string; source?: string }>
  }
}

export interface ToolRuntimeResult {
  toolName: string
  result: ToolResult
}

const MAX_TOOL_CALLS = 3

/**
 * Execute a tool call within the Agent Loop.
 * Only supports read.project_context — all other tools are rejected.
 */
export async function executeToolCall(
  toolName: string,
  input: Record<string, unknown>,
  context: ToolRuntimeContext
): Promise<ToolRuntimeResult> {
  if (toolName === 'read.project_context') {
    return {
      toolName,
      result: executeReadProjectContext(input, context),
    }
  }

  return {
    toolName,
    result: {
      status: 'failed',
      confidence: 0,
      summary: `Tool "${toolName}" is not supported in this runtime. Only read.project_context is available.`,
      next: {
        recommendedAction: 'stop',
        reason: `Unknown tool: ${toolName}`,
      },
      sideEffects: [],
    },
  }
}

function executeReadProjectContext(
  input: Record<string, unknown>,
  context: ToolRuntimeContext
): ToolResult {
  const scope = (input.scope as string) ?? 'all'
  const items = context.contextPacket?.items ?? []

  if (items.length === 0) {
    return {
      status: 'success',
      confidence: 0.5,
      summary: 'No context items available in the ContextPacket.',
      data: { scope, items: [], totalTokens: 0 },
      next: {
        recommendedAction: 'continue',
        reason: 'Context is empty, but analysis can proceed without it.',
      },
      sideEffects: [],
    }
  }

  const filteredItems =
    scope === 'all'
      ? items
      : items.filter((item) => item.type === scope)

  const totalChars = filteredItems.reduce((sum, item) => sum + item.content.length, 0)
  const approxTokens = Math.ceil(totalChars / 4)

  return {
    status: 'success',
    confidence: 0.9,
    summary: `Retrieved ${filteredItems.length} context items (${approxTokens} approx tokens).`,
    data: {
      scope,
      items: filteredItems.map((item) => ({
        type: item.type,
        content: item.content.slice(0, 2000),
        source: item.source,
      })),
      totalTokens: approxTokens,
    },
    next: {
      recommendedAction: 'continue',
      reason: 'Context loaded successfully. Proceed with analysis.',
    },
    sideEffects: [],
  }
}

export { MAX_TOOL_CALLS }
