export type SandboxAllowedExtension = '.md' | '.json' | '.txt'

export interface SandboxFileWriteProfile {
  id: string
  allowedRoot: 'deliverables'
  allowedExtensions: SandboxAllowedExtension[]
  maxContentChars: number
}

export interface SandboxFileWriteInput {
  targetPath: string
  content: string
  format: 'md' | 'json' | 'txt'
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
