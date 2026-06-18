import {
  FileGitPrRepositoryError,
  createFileChangeProposal,
} from '@/lib/file-git-pr/repository'
import type { FileTargetMetadata } from '@/lib/file-git-pr/types'

export function fileGitPrErrorResponse(error: unknown) {
  if (error instanceof FileGitPrRepositoryError) {
    return Response.json(
      { ok: false, error: { code: 'file_git_pr_error', message: error.message } },
      { status: error.status }
    )
  }

  if (error instanceof Error) {
    return Response.json(
      { ok: false, error: { code: 'validation_error', message: error.message } },
      { status: 400 }
    )
  }

  return Response.json(
    { ok: false, error: { code: 'unexpected_error', message: 'Unexpected Sprint 12 API error.' } },
    { status: 500 }
  )
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json()
  if (!isObject(body)) throw new Error('JSON body must be an object.')
  return body
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : undefined
}

export function targetFilesValue(value: unknown): FileTargetMetadata[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.filter(isObject).map((item) => ({
    path: stringValue(item.path) ?? 'metadata-only',
    pathKind: 'metadata_only',
    changeIntent: (stringValue(item.changeIntent) ?? 'other') as FileTargetMetadata['changeIntent'],
    riskLevel: (stringValue(item.riskLevel) ?? 'medium') as FileTargetMetadata['riskLevel'],
  }))
}

export function localRecordPayload(data: Awaited<ReturnType<typeof createFileChangeProposal>>) {
  return {
    ok: true,
    data: data.fileChangeProposal,
    auditEvents: data.auditEvents,
    observabilityEvents: data.observabilityEvents,
  }
}
