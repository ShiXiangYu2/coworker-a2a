import { createHash } from 'node:crypto'
import type {
  ToolCall,
  ToolDefinition,
  ToolExecutionPlan,
  ToolExecutionPolicy,
  ToolExecutionReceipt,
  ToolExecutor,
  ToolPermission,
  ToolResult,
  ToolRun,
  ToolSandbox,
} from './types'

const createdAt = '2026-06-16T00:00:00.000Z'

export const defaultToolExecutionPolicy: ToolExecutionPolicy = {
  id: 'tool-execution-policy-sprint-11',
  policyVersion: 'sprint-11.0',
  status: 'active',
  defaultDecision: 'deny',
  allowedToolCategories: ['internal_noop', 'read_simulated'],
  deniedToolCategories: [
    'read',
    'write',
    'command',
    'git',
    'pr',
    'deploy',
    'database',
    'external_api',
    'mcp',
    'browser',
    'file_read',
    'file_write',
    'database_migration',
  ],
  requiresKelvinForRisk: ['medium', 'high', 'critical'],
  maxRuntimeMs: 1000,
  maxInputSizeChars: 12000,
  maxOutputSizeChars: 12000,
  requireRecoveryPointBeforeExecution: true,
  requireAuditEvent: true,
  requireObservabilityEvent: true,
  requireIdempotencyKey: true,
  requireDeterministicOutput: true,
  allowAutomaticFutureApproval: false,
  allowRetry: false,
  allowReplay: false,
  allowRollback: false,
  allowResumeExecution: false,
  createdAt,
  updatedAt: createdAt,
}

export const defaultToolSandbox: ToolSandbox = {
  id: 'local-deterministic-sandbox-sprint-11',
  sandboxVersion: 'sprint-11.0',
  mode: 'local_deterministic',
  allowShell: false,
  allowGit: false,
  allowFileRead: false,
  allowFileWrite: false,
  allowNetwork: false,
  allowExternalApi: false,
  allowMcp: false,
  allowBrowser: false,
  allowDatabaseMigration: false,
  allowEnvironmentRead: false,
  allowQueue: false,
  allowWorker: false,
  maxRuntimeMs: 1000,
  maxInputSizeChars: 12000,
  maxOutputSizeChars: 12000,
  createdAt,
  updatedAt: createdAt,
}

export const toolExecutors: ToolExecutor[] = [
  {
    id: 'internal_noop.executor',
    executorVersion: 'sprint-11.0',
    toolId: 'noop.note',
    toolCategory: 'internal_noop',
    executionMode: 'deterministic_local',
    enabled: true,
    sandboxId: defaultToolSandbox.id,
    policyId: defaultToolExecutionPolicy.id,
    maxInputSizeChars: 12000,
    maxOutputSizeChars: 12000,
    timeoutMs: 1000,
    idempotencyRequired: true,
    sideEffectClass: 'none',
    deterministicOutputRequired: true,
    createdAt,
    updatedAt: createdAt,
  },
  {
    id: 'read_simulated.executor',
    executorVersion: 'sprint-11.0',
    toolId: 'read_simulated.project_summary',
    toolCategory: 'read_simulated',
    executionMode: 'deterministic_local',
    enabled: true,
    sandboxId: defaultToolSandbox.id,
    policyId: defaultToolExecutionPolicy.id,
    maxInputSizeChars: 12000,
    maxOutputSizeChars: 12000,
    timeoutMs: 1000,
    idempotencyRequired: true,
    sideEffectClass: 'simulated_read',
    deterministicOutputRequired: true,
    createdAt,
    updatedAt: createdAt,
  },
]

export class ToolExecutionGuardError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'ToolExecutionGuardError'
  }
}

export function getToolExecutionPolicy(): ToolExecutionPolicy {
  return defaultToolExecutionPolicy
}

export function listToolExecutors(): ToolExecutor[] {
  return toolExecutors
}

export function getToolExecutor(id: string): ToolExecutor | null {
  return toolExecutors.find((executor) => executor.id === id) ?? null
}

export function listToolSandboxes(): ToolSandbox[] {
  return [defaultToolSandbox]
}

export function getToolSandbox(id: string): ToolSandbox | null {
  return id === defaultToolSandbox.id ? defaultToolSandbox : null
}

export function stableHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex')
}

export function validateToolSandbox(sandbox: ToolSandbox): void {
  const forbidden: Array<keyof ToolSandbox> = [
    'allowShell',
    'allowGit',
    'allowFileRead',
    'allowFileWrite',
    'allowNetwork',
    'allowExternalApi',
    'allowMcp',
    'allowBrowser',
    'allowDatabaseMigration',
    'allowEnvironmentRead',
    'allowQueue',
    'allowWorker',
  ]
  const allowed = forbidden.filter((key) => sandbox[key] !== false)
  if (allowed.length > 0) {
    throw new ToolExecutionGuardError(`ToolSandbox allows forbidden capabilities: ${allowed.join(', ')}`)
  }
}

export function validateExecutionPolicy(
  policy: ToolExecutionPolicy,
  tool: ToolDefinition,
  executor: ToolExecutor
): void {
  if (policy.defaultDecision !== 'deny' || policy.status !== 'active') {
    throw new ToolExecutionGuardError('ToolExecutionPolicy is not active default-deny.')
  }
  if (!policy.allowedToolCategories.includes(executor.toolCategory)) {
    throw new ToolExecutionGuardError('Tool category is not allowed for Sprint 11 execution.')
  }
  if (policy.deniedToolCategories.includes(tool.category)) {
    throw new ToolExecutionGuardError(`Tool category ${tool.category} is explicitly denied.`)
  }
  if (!['internal_noop', 'read_simulated'].includes(tool.category)) {
    throw new ToolExecutionGuardError(`Tool category ${tool.category} cannot execute in Sprint 11.`)
  }
  if (
    policy.allowAutomaticFutureApproval ||
    policy.allowRetry ||
    policy.allowReplay ||
    policy.allowRollback ||
    policy.allowResumeExecution
  ) {
    throw new ToolExecutionGuardError('ToolExecutionPolicy enables forbidden automation.')
  }
}

export function validatePlanNotExpired(plan: Pick<ToolExecutionPlan, 'status' | 'expiresAt'>): void {
  if (plan.status === 'expired') throw new ToolExecutionGuardError('Expired ToolExecutionPlan cannot execute.')
  if (plan.expiresAt && new Date(plan.expiresAt).getTime() <= Date.now()) {
    throw new ToolExecutionGuardError('Expired ToolExecutionPlan cannot execute.')
  }
}

export function assertAllowControlledExecution(permission: ToolPermission | null | undefined): void {
  if (!permission) throw new ToolExecutionGuardError('ToolPermission is required.')
  if (permission.decision !== 'allow_controlled_execution') {
    throw new ToolExecutionGuardError(`${permission.decision} cannot execute.`)
  }
}

export function assertControlledToolRun(toolRun: ToolRun): void {
  if (toolRun.mode !== 'controlled_execution') {
    throw new ToolExecutionGuardError('Legacy ToolRun cannot enter Sprint 11 execution states.')
  }
}

export function validateExecutionPreconditions(input: {
  toolRun: ToolRun
  plan: ToolExecutionPlan
  permission?: ToolPermission | null
  recoveryPoint?: { reason: string; id: string } | null
  confirmationArtifact?: { id: string; status: string } | null
}): void {
  assertControlledToolRun(input.toolRun)
  assertAllowControlledExecution(input.permission)
  validatePlanNotExpired(input.plan)
  if (input.toolRun.status !== 'approved_for_execution') {
    throw new ToolExecutionGuardError('ToolRun must be approved_for_execution before execute-approved.')
  }
  if (input.plan.status !== 'approved_record') {
    throw new ToolExecutionGuardError('ToolExecutionPlan must be approved_record.')
  }
  if (!input.plan.idempotencyKey) throw new ToolExecutionGuardError('idempotencyKey is required.')
  if (input.plan.expectedSideEffects.length !== 0) {
    throw new ToolExecutionGuardError('ToolExecutionPlan expectedSideEffects must be empty.')
  }
  if (!input.recoveryPoint || input.recoveryPoint.reason !== 'before_tool_execution') {
    throw new ToolExecutionGuardError('RecoveryPoint reason before_tool_execution is required before execution.')
  }
  if (input.plan.requiresKelvinConfirmation) {
    if (!input.confirmationArtifact || input.confirmationArtifact.status !== 'approved') {
      throw new ToolExecutionGuardError('Approved Kelvin confirmation is required.')
    }
  }
}

export function validateToolResult(result: ToolResult): void {
  if (result.sideEffects.length !== 0) {
    throw new ToolExecutionGuardError('ToolResult.sideEffects must be empty.')
  }
  if (result.sideEffectClass && !['none', 'simulated_read'].includes(result.sideEffectClass)) {
    throw new ToolExecutionGuardError('Invalid sideEffectClass.')
  }
}

export function executeDeterministicLocalTool(input: {
  toolRun: ToolRun
  toolCall: ToolCall
  plan: ToolExecutionPlan
  executor: ToolExecutor
}): {
  result: ToolResult
  resultSnapshot: Record<string, unknown>
  simulatedReads?: ToolExecutionReceipt['simulatedReads']
} {
  const base = {
    toolId: input.toolRun.toolId,
    normalizedInputHash: input.plan.normalizedInputHash,
    policyVersion: input.plan.policyVersion,
    executorVersion: input.plan.executorVersion,
  }

  if (input.executor.toolCategory === 'internal_noop') {
    const resultSnapshot = {
      ...base,
      kind: 'internal_noop',
      acknowledged: true,
      summary: input.toolCall.inputSummary,
    }
    const result = buildSuccessResult(input, resultSnapshot, 'Deterministic local no-op ToolRun succeeded.')
    return { result, resultSnapshot }
  }

  const key = readSimulatedKey(input.toolCall.input)
  const simulated = {
    source: 'local_in_memory' as const,
    key,
    value: simulatedReadValue(key),
  }
  const resultSnapshot = {
    ...base,
    kind: 'read_simulated',
    simulated,
  }
  const result = buildSuccessResult(input, resultSnapshot, 'Deterministic simulated-read ToolRun succeeded.')
  return {
    result,
    resultSnapshot,
    simulatedReads: [{ source: simulated.source, key, hash: stableHash(simulated.value) }],
  }
}

export function assertDeterministicOutput(
  first: unknown,
  second: unknown,
  context = 'ToolExecutor output'
): void {
  if (stableHash(first) !== stableHash(second)) {
    throw new ToolExecutionGuardError(`${context} is non-deterministic.`)
  }
}

function buildSuccessResult(
  input: { plan: ToolExecutionPlan },
  data: Record<string, unknown>,
  summary: string
): ToolResult {
  return {
    status: 'success',
    confidence: 1,
    summary,
    data,
    next: {
      recommendedAction: 'stop',
      reason: 'Sprint 11 controlled local execution does not continue AgentRun or Task.',
    },
    sideEffects: [],
    sideEffectClass: input.plan.sideEffectClass,
    reversibility: input.plan.reversibility,
    idempotencyKey: input.plan.idempotencyKey,
    inputHash: input.plan.normalizedInputHash,
    outputHash: stableHash(data),
    recoveryPointId: input.plan.recoveryPointId,
    auditRefs: [],
    observabilityRefs: [],
  }
}

function readSimulatedKey(input: unknown): string {
  if (input && typeof input === 'object' && !Array.isArray(input)) {
    const key = (input as Record<string, unknown>).key
    if (typeof key === 'string' && key.trim()) return key
  }
  return 'default'
}

function simulatedReadValue(key: string): Record<string, unknown> {
  const fixtures: Record<string, Record<string, unknown>> = {
    default: {
      project: 'coworker-a2a',
      sprint: 11,
      capability: 'controlled deterministic local tool runtime',
    },
    safety: {
      shell: false,
      git: false,
      fileRead: false,
      fileWrite: false,
      externalApi: false,
      mcp: false,
      browser: false,
    },
  }
  return fixtures[key] ?? { key, value: 'simulated-read-fixture' }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(',')}}`
}
