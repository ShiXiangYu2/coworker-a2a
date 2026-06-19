import { relative, sep } from 'node:path'

export type PolicyDecision = 'allow_dry_run' | 'allow_controlled_execution' | 'requires_kelvin_approval' | 'deny'

export interface PolicyCheckInput {
  toolId: string
  action: string
  riskLevel: 'low' | 'medium' | 'high'
  targetPath: string
  allowedDirectory: string
  dryRun: boolean
  approved: boolean
  approvalRecordId?: string
  allowOverwrite?: boolean
}

export interface PolicyCheckResult {
  decision: PolicyDecision
  allowed: boolean
  reasons: string[]
  requiresKelvinApproval: boolean
}

export function checkExecutionPolicy(input: PolicyCheckInput): PolicyCheckResult {
  const reasons: string[] = []
  const requiresKelvinApproval = input.riskLevel !== 'low' || !input.dryRun

  if (!isInsideDirectory(input.allowedDirectory, input.targetPath)) {
    return {
      decision: 'deny',
      allowed: false,
      reasons: ['Target path is outside the allowed directory.'],
      requiresKelvinApproval,
    }
  }

  if (input.allowOverwrite === true) {
    return {
      decision: 'deny',
      allowed: false,
      reasons: ['Overwriting existing files is not allowed by default policy.'],
      requiresKelvinApproval,
    }
  }

  if (input.dryRun) {
    reasons.push('Dry run is allowed without producing a vault draft.')
    return {
      decision: 'allow_dry_run',
      allowed: true,
      reasons,
      requiresKelvinApproval,
    }
  }

  if (!input.approved || !input.approvalRecordId) {
    return {
      decision: 'requires_kelvin_approval',
      allowed: false,
      reasons: ['Kelvin approval is required before controlled tool execution.'],
      requiresKelvinApproval,
    }
  }

  reasons.push('Kelvin approval is present for this single controlled tool execution.')
  return {
    decision: 'allow_controlled_execution',
    allowed: true,
    reasons,
    requiresKelvinApproval,
  }
}

function isInsideDirectory(directory: string, targetPath: string): boolean {
  const rel = relative(directory, targetPath)
  return rel === '' || (!rel.startsWith('..') && rel !== '..' && !rel.includes(`..${sep}`))
}
