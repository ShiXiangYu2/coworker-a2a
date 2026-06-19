import { createHash, randomUUID } from 'node:crypto'
import { mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type {
  SandboxAllowedExtension,
  SandboxFileWriteInput,
  SandboxFileWriteProfile,
  SandboxFileWriteResult,
} from './types'

export class SandboxFileWriteError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message)
    this.name = 'SandboxFileWriteError'
  }
}

export const sprint22FileWriteProfile: SandboxFileWriteProfile = {
  id: 'sandbox-file-write-deliverables-sprint-22',
  allowedRoot: 'deliverables',
  allowedExtensions: ['.md', '.json', '.txt'],
  maxContentChars: 12000,
}

export const sprint23FileWriteProfile: SandboxFileWriteProfile = {
  id: 'sandbox-file-write-controlled-sprint-23',
  allowedRoot: 'tmp',
  allowedExtensions: ['.md', '.json', '.txt', '.ts', '.js'],
  maxContentChars: 50_000,
}

export function validateSandboxFileWriteInput(
  input: unknown,
  profile: SandboxFileWriteProfile = sprint22FileWriteProfile
): SandboxFileWriteInput {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new SandboxFileWriteError('Sandbox file write input must be an object.')
  }
  const record = input as Record<string, unknown>
  const targetPath = record.targetPath
  const content = record.content
  const format = record.format
  if (typeof targetPath !== 'string' || !targetPath.trim()) {
    throw new SandboxFileWriteError('targetPath is required.')
  }
  if (typeof content !== 'string' || !content.length) {
    throw new SandboxFileWriteError('content is required.')
  }
  if (content.length > profile.maxContentChars) {
    throw new SandboxFileWriteError('content exceeds sandbox maxContentChars.')
  }
  const allowedFormats = profile.allowedExtensions.map((ext) => ext.slice(1))
  if (!allowedFormats.includes(format as string)) {
    throw new SandboxFileWriteError(`format must be one of: ${allowedFormats.join(', ')}.`)
  }
  return { targetPath, content, format: format as SandboxFileWriteInput['format'] }
}

export function normalizeSandboxTargetPath(
  targetPath: string,
  options: {
    projectRoot?: string
    profile?: SandboxFileWriteProfile
  } = {}
): {
  outputPath: string
  relativePath: string
  extension: SandboxAllowedExtension
  allowedRootPath: string
} {
  const profile = options.profile ?? sprint22FileWriteProfile
  const projectRoot = options.projectRoot ?? process.cwd()
  const allowedRootPath = path.resolve(projectRoot, profile.allowedRoot)
  const normalizedTargetPath = path.resolve(projectRoot, targetPath)
  const relativePath = path.relative(allowedRootPath, normalizedTargetPath)
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new SandboxFileWriteError(`targetPath must stay inside ${profile.allowedRoot}/.`)
  }
  const extension = path.extname(normalizedTargetPath).toLowerCase() as SandboxAllowedExtension
  if (!profile.allowedExtensions.includes(extension)) {
    throw new SandboxFileWriteError(`targetPath extension must be one of: ${profile.allowedExtensions.join(', ')}.`)
  }
  return {
    outputPath: normalizedTargetPath,
    relativePath: path.join(profile.allowedRoot, relativePath).replaceAll('\\', '/'),
    extension,
    allowedRootPath,
  }
}

export async function writeSandboxDeliverable(
  input: unknown,
  options: {
    projectRoot?: string
    profile?: SandboxFileWriteProfile
  } = {}
): Promise<SandboxFileWriteResult> {
  const profile = options.profile ?? sprint22FileWriteProfile
  const validated = validateSandboxFileWriteInput(input, profile)
  const target = normalizeSandboxTargetPath(validated.targetPath, {
    projectRoot: options.projectRoot,
    profile,
  })
  const bytes = Buffer.from(validated.content, 'utf8')
  const dir = path.dirname(target.outputPath)
  await mkdir(dir, { recursive: true })
  const tempPath = path.join(dir, `.${path.basename(target.outputPath)}.${randomUUID()}.tmp`)
  await writeFile(tempPath, bytes)
  await rename(tempPath, target.outputPath)
  return {
    sandboxProfileId: profile.id,
    outputPath: target.outputPath,
    relativePath: target.relativePath,
    allowedRoot: profile.allowedRoot,
    extension: target.extension,
    bytesWritten: bytes.byteLength,
    contentHash: createHash('sha256').update(bytes).digest('hex'),
    createdDirectory: true,
    sideEffectClass: 'sandbox_file_write',
  }
}
