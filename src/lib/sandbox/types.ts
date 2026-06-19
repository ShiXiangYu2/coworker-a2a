export type SandboxAllowedExtension = '.md' | '.json' | '.txt' | '.ts' | '.js'

export interface SandboxFileWriteProfile {
  id: string
  allowedRoot: 'deliverables' | 'tmp'
  allowedExtensions: SandboxAllowedExtension[]
  maxContentChars: number
}

export interface SandboxFileWriteInput {
  targetPath: string
  content: string
  format: 'md' | 'json' | 'txt' | 'ts' | 'js'
}

export interface SandboxFileWriteResult {
  sandboxProfileId: string
  outputPath: string
  relativePath: string
  allowedRoot: string
  extension: SandboxAllowedExtension
  bytesWritten: number
  contentHash: string
  createdDirectory: boolean
  sideEffectClass: 'sandbox_file_write'
}
