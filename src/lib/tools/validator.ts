import type { ToolResult } from './types'

export class InvalidToolResultError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidToolResultError'
  }
}

const executedClaimPatterns = [
  /commands?\s+(were\s+)?run/i,
  /files?\s+(were\s+)?(changed|edited|written|deleted)/i,
  /git\s+(operation|commit|push)/i,
  /pr\s+(was\s+)?created/i,
  /deployed/i,
  /external\s+api\s+(was\s+)?called/i,
  /mcp\s+tool\s+(was\s+)?invoked/i,
  /browser\s+automation/i,
]

export function validateToolResult(result: ToolResult): ToolResult {
  if (!result || typeof result !== 'object') {
    throw new InvalidToolResultError('ToolResult must be an object.')
  }
  if (result.confidence < 0 || result.confidence > 1) {
    throw new InvalidToolResultError('ToolResult confidence must be between 0 and 1.')
  }
  if (!Array.isArray(result.sideEffects) || result.sideEffects.length > 0) {
    throw new InvalidToolResultError('ToolResult.sideEffects must be empty in Sprint 6.')
  }
  const text = [
    result.summary,
    result.next.reason,
    ...(result.warnings ?? []),
  ].join('\n')
  if (executedClaimPatterns.some((pattern) => pattern.test(text))) {
    throw new InvalidToolResultError('ToolResult must not claim real execution.')
  }
  return result
}
