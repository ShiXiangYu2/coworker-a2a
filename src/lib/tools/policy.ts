import { normalizeSandboxTargetPath, validateSandboxFileWriteInput } from '@/lib/sandbox/file-write-sandbox'
import { findToolByIdOrName, getPermissionProfile } from './registry'
import type {
  ToolCall,
  ToolDefinition,
  ToolPermission,
  ToolPermissionDecision,
} from './types'

export function validateToolInput(
  tool: ToolDefinition | undefined,
  input: unknown
): Pick<ToolPermission, 'inputValidationStatus' | 'schemaValidationErrors'> {
  if (!tool) return { inputValidationStatus: 'skipped' }
  if (tool.id === 'write.sandbox_deliverable') return validateSandboxToolInput(input)
  if (!tool.inputSchema || tool.inputSchema.type !== 'object') {
    return { inputValidationStatus: 'skipped' }
  }
  if (!isRecord(input)) {
    return {
      inputValidationStatus: 'invalid',
      schemaValidationErrors: ['input must be an object'],
    }
  }

  const errors: string[] = []
  for (const required of tool.inputSchema.required ?? []) {
    if (!(required in input)) errors.push(`${required} is required`)
  }
  for (const [key, schema] of Object.entries(tool.inputSchema.properties ?? {})) {
    if (!(key in input) || schema.type === undefined) continue
    if (typeof input[key] !== schema.type) {
      errors.push(`${key} must be ${schema.type}`)
    }
  }

  return errors.length > 0
    ? { inputValidationStatus: 'invalid', schemaValidationErrors: errors }
    : { inputValidationStatus: 'valid' }
}

function validateSandboxToolInput(
  input: unknown
): Pick<ToolPermission, 'inputValidationStatus' | 'schemaValidationErrors'> {
  try {
    const validated = validateSandboxFileWriteInput(input)
    normalizeSandboxTargetPath(validated.targetPath)
    return { inputValidationStatus: 'valid' }
  } catch (error) {
    return {
      inputValidationStatus: 'invalid',
      schemaValidationErrors: [error instanceof Error ? error.message : 'Invalid sandbox file write input.'],
    }
  }
}

export function evaluateToolPermission(toolCall: ToolCall): Omit<ToolPermission, 'id' | 'createdAt'> {
  const tool = findToolByIdOrName(toolCall.toolId) ?? findToolByIdOrName(toolCall.toolName)
  const validation = validateToolInput(tool, toolCall.input)
  const matchedRules: string[] = ['default-deny']
  const deniedRules: string[] = []
  let decision: ToolPermissionDecision = 'blocked'
  let reason = 'Tool is blocked by default-deny policy.'
  const profile = tool ? getPermissionProfile(tool.permissionProfileRef) : undefined

  if (!tool) {
    deniedRules.push('tool.unknown')
    reason = 'Unknown tool is blocked.'
  } else if (!tool.enabled || tool.sprint6Mode === 'disabled') {
    deniedRules.push('tool.disabled')
    reason = 'Disabled tool is blocked.'
  } else if (!profile) {
    deniedRules.push('policy.profile_missing')
    reason = 'Permission profile is missing.'
  } else if (validation.inputValidationStatus === 'invalid') {
    deniedRules.push('input.invalid')
    decision = 'deny'
    reason = 'ToolCall input failed schema validation.'
  } else if (toolCall.sideEffects.length > 0) {
    matchedRules.push('side_effects.non_empty')
    decision = 'requires_human'
    reason = 'Non-empty sideEffects require Kelvin review.'
  } else if (profile.deniedToolCategories.includes(tool.category)) {
    deniedRules.push(`category.${tool.category}.denied`)
    decision = tool.requiresHumanConfirmation ? 'requires_human' : 'deny'
    reason = tool.requiresHumanConfirmation
      ? 'Denied high-risk category requires Kelvin review as a local record only.'
      : 'Denied category cannot proceed.'
  } else if (tool.id === 'write.sandbox_deliverable') {
    matchedRules.push('sprint22.human_gated_sandbox_write')
    decision = 'allow_controlled_execution'
    reason = 'Sandbox deliverable write may continue only through human-gated controlled execution.'
  } else if (tool.isDestructive || tool.isOpenWorld) {
    matchedRules.push('risk.destructive_or_open_world')
    decision = 'requires_human'
    reason = 'Destructive or open-world tools require Kelvin review.'
  } else if (profile.requiresHumanForRisk.includes(tool.riskLevel as never)) {
    matchedRules.push(`risk.${tool.riskLevel}.requires_human`)
    decision = 'requires_human'
    reason = 'Risk level requires Kelvin review.'
  } else if (profile.allowedToolCategories.includes(tool.category)) {
    matchedRules.push(`category.${tool.category}.record_only`)
    decision = 'allow_record_only'
    reason = 'ToolCall may remain a local proposal record only. It cannot execute.'
  }

  return {
    toolCallId: toolCall.id,
    toolId: tool?.id ?? toolCall.toolId,
    decision,
    reason,
    evaluatedBy: 'policy',
    policyRef: 'command-policy-sprint-6',
    permissionProfileRef: tool?.permissionProfileRef ?? 'default-deny-sprint-6',
    riskLevel: tool?.riskLevel ?? toolCall.riskLevel,
    inputValidationStatus: validation.inputValidationStatus,
    schemaValidationErrors: validation.schemaValidationErrors,
    matchedRules,
    deniedRules,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
