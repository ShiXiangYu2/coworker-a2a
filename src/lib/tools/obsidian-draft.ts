import { randomUUID } from 'node:crypto'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, relative, resolve, sep } from 'node:path'

export type ObsidianDraftAction = 'write_local_markdown_draft'
export type ObsidianDraftReceiptStatus = 'dry_run' | 'denied' | 'succeeded'

export interface ObsidianDraftPlan {
  id: string
  action: ObsidianDraftAction
  riskLevel: 'low' | 'medium'
  draftTitle: string
  filename: string
  content: string
  targetDirectory: string
  targetPath: string
  dryRun: boolean
  createdAt: string
}

export interface ObsidianDraftReceipt {
  id: string
  action: ObsidianDraftAction
  status: ObsidianDraftReceiptStatus
  path: string
  timestamp: string
  executionPlanId: string
  approvedBy?: 'kelvin'
  approvalRecordId?: string
  reason: string
}

interface ObsidianDraftOptions {
  vaultPath?: string
  now?: Date
}

interface ExecuteObsidianDraftOptions extends ObsidianDraftOptions {
  approved: boolean
  approvalRecordId?: string
  approvedBy?: 'kelvin'
}

const DEFAULT_VAULT_PATH = 'D:\\AI' + '\u77e5\u8bc6\u5e93'
const OBSIDIAN_DRAFT_SUBDIR = ['Inbox', 'AI Drafts'] as const

export function createObsidianDraftPlan(input: {
  draftTitle: string
  filename: string
  content: string
  riskLevel?: 'low' | 'medium'
  dryRun?: boolean
}, options: ObsidianDraftOptions = {}): ObsidianDraftPlan {
  const targetDirectory = resolveDraftDirectory(options.vaultPath)
  const filename = sanitizeMarkdownFilename(input.filename)
  const targetPath = resolve(/* turbopackIgnore: true */ targetDirectory, filename)
  assertInsideDirectory(targetDirectory, targetPath)

  return {
    id: `obsidian-draft-plan-${randomUUID()}`,
    action: 'write_local_markdown_draft',
    riskLevel: input.riskLevel ?? 'low',
    draftTitle: input.draftTitle,
    filename,
    content: input.content,
    targetDirectory,
    targetPath,
    dryRun: input.dryRun ?? true,
    createdAt: (options.now ?? new Date()).toISOString(),
  }
}

export async function executeObsidianDraftPlan(
  plan: ObsidianDraftPlan,
  options: ExecuteObsidianDraftOptions
): Promise<ObsidianDraftReceipt> {
  const timestamp = (options.now ?? new Date()).toISOString()

  if (!options.approved || !options.approvalRecordId || options.approvedBy !== 'kelvin') {
    return {
      id: `obsidian-draft-receipt-${randomUUID()}`,
      action: plan.action,
      status: 'denied',
      path: plan.targetPath,
      timestamp,
      executionPlanId: plan.id,
      reason: 'Kelvin approval is required before producing the Obsidian vault Markdown draft.',
    }
  }

  if (plan.dryRun) {
    return {
      id: `obsidian-draft-receipt-${randomUUID()}`,
      action: plan.action,
      status: 'dry_run',
      path: plan.targetPath,
      timestamp,
      executionPlanId: plan.id,
      approvedBy: options.approvedBy,
      approvalRecordId: options.approvalRecordId,
      reason: 'Dry run completed without creating an Obsidian vault Markdown draft.',
    }
  }

  assertInsideDirectory(plan.targetDirectory, plan.targetPath)
  const targetPath = await nextAvailablePath(plan.targetPath, timestamp)
  assertInsideDirectory(plan.targetDirectory, targetPath)

  await mkdir(/* turbopackIgnore: true */ plan.targetDirectory, { recursive: true })
  await writeFile(/* turbopackIgnore: true */ targetPath, plan.content, 'utf8')

  return {
    id: `obsidian-draft-receipt-${randomUUID()}`,
    action: plan.action,
    status: 'succeeded',
    path: targetPath,
    timestamp,
    executionPlanId: plan.id,
    approvedBy: options.approvedBy,
    approvalRecordId: options.approvalRecordId,
    reason: 'Kelvin-approved demo produced an Obsidian vault Markdown draft.',
  }
}

function sanitizeMarkdownFilename(filename: string): string {
  const normalized = filename.trim().replace(/[\\/:*?"<>|]+/g, '-')
  const withExtension = normalized.toLowerCase().endsWith('.md') ? normalized : `${normalized}.md`
  const safe = withExtension.replace(/\s+/g, '-')
  if (!safe || safe === '.md' || safe.includes('..')) {
    throw new Error('Invalid Obsidian draft filename.')
  }
  return safe
}

function assertInsideDirectory(directory: string, targetPath: string): void {
  const rel = relative(directory, targetPath)
  if (rel.startsWith('..') || rel === '..' || rel.includes(`..${sep}`)) {
    throw new Error('Obsidian draft path must stay inside the configured vault Inbox/AI Drafts directory.')
  }
}

function resolveDraftDirectory(vaultPath: string | undefined): string {
  const vaultRoot = resolve(/* turbopackIgnore: true */ vaultPath?.trim() || process.env.OBSIDIAN_VAULT_PATH?.trim() || DEFAULT_VAULT_PATH)
  return resolve(/* turbopackIgnore: true */ vaultRoot, ...OBSIDIAN_DRAFT_SUBDIR)
}

async function nextAvailablePath(targetPath: string, timestamp: string): Promise<string> {
  try {
    await access(/* turbopackIgnore: true */ targetPath)
  } catch {
    return targetPath
  }

  const dir = dirname(targetPath)
  const ext = extname(targetPath) || '.md'
  const name = basename(targetPath, ext)
  const suffix = timestamp.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z').replace('T', '-')
  return resolve(/* turbopackIgnore: true */ dir, `${name}-${suffix}${ext}`)
}
