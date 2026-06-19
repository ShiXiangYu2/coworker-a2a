// 沙箱环境管理

import { randomUUID } from 'node:crypto'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

export interface SandboxConfig {
  allowedRoots: string[]
  blockedPatterns: string[]
  maxExecutionTimeMs: number
  maxFileSizeBytes: number
  allowNetwork: boolean
  allowFileSystem: boolean
  allowCodeExecution: boolean
}

export interface SandboxEnvironment {
  id: string
  tempDir: string
  config: SandboxConfig
  createdAt: Date
}

export class SandboxManager {
  private sandboxes: Map<string, SandboxEnvironment> = new Map()
  private defaultConfig: SandboxConfig

  constructor(config?: Partial<SandboxConfig>) {
    this.defaultConfig = {
      allowedRoots: ['./deliverables', './output', './temp'],
      blockedPatterns: ['DROP TABLE', 'DELETE FROM', 'rm -rf', 'sudo', 'chmod 777'],
      maxExecutionTimeMs: 30000,
      maxFileSizeBytes: 10 * 1024 * 1024, // 10MB
      allowNetwork: true,
      allowFileSystem: true,
      allowCodeExecution: true,
      ...config,
    }
  }

  /**
   * 创建沙箱环境
   */
  async createSandbox(config?: Partial<SandboxConfig>): Promise<SandboxEnvironment> {
    const id = randomUUID()
    const tempDir = path.join(os.tmpdir(), `coworker-sandbox-${id}`)

    await fs.mkdir(tempDir, { recursive: true })

    const sandbox: SandboxEnvironment = {
      id,
      tempDir,
      config: { ...this.defaultConfig, ...config },
      createdAt: new Date(),
    }

    this.sandboxes.set(id, sandbox)
    return sandbox
  }

  /**
   * 销毁沙箱环境
   */
  async destroySandbox(id: string): Promise<void> {
    const sandbox = this.sandboxes.get(id)
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${id}`)
    }

    await fs.rm(sandbox.tempDir, { recursive: true, force: true })
    this.sandboxes.delete(id)
  }

  /**
   * 获取沙箱环境
   */
  getSandbox(id: string): SandboxEnvironment | undefined {
    return this.sandboxes.get(id)
  }

  /**
   * 检查路径是否在沙箱内
   */
  isPathInSandbox(sandboxId: string, filePath: string): boolean {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      return false
    }

    const resolvedPath = path.resolve(filePath)
    return resolvedPath.startsWith(sandbox.tempDir)
  }

  /**
   * 检查路径是否在允许的根目录内
   */
  isPathAllowed(filePath: string, config?: SandboxConfig): boolean {
    const cfg = config || this.defaultConfig
    const resolvedPath = path.resolve(filePath)

    return cfg.allowedRoots.some(root => {
      const resolvedRoot = path.resolve(root)
      return resolvedPath.startsWith(resolvedRoot)
    })
  }

  /**
   * 检查输入是否包含危险模式
   */
  containsBlockedPattern(input: string, config?: SandboxConfig): boolean {
    const cfg = config || this.defaultConfig
    return cfg.blockedPatterns.some(pattern => input.includes(pattern))
  }

  /**
   * 在沙箱中执行命令
   */
  async executeInSandbox(
    sandboxId: string,
    command: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${sandboxId}`)
    }

    // 检查命令是否包含危险模式
    if (this.containsBlockedPattern(command, sandbox.config)) {
      throw new Error(`Command contains blocked pattern`)
    }

    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: sandbox.tempDir,
        timeout: sandbox.config.maxExecutionTimeMs,
        env: {
          ...process.env,
          NODE_ENV: 'development' as const,
          SANDBOX_ID: sandbox.id,
        },
      })

      return { stdout, stderr, exitCode: 0 }
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; message?: string; code?: number }
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || err.message || 'Unknown error',
        exitCode: err.code || 1,
      }
    }
  }

  /**
   * 在沙箱中写入文件
   */
  async writeFileInSandbox(
    sandboxId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${sandboxId}`)
    }

    // 检查文件大小
    if (content.length > sandbox.config.maxFileSizeBytes) {
      throw new Error(`File size exceeds maximum: ${sandbox.config.maxFileSizeBytes} bytes`)
    }

    // 检查路径是否在沙箱内
    const resolvedPath = path.resolve(sandbox.tempDir, filePath)
    if (!resolvedPath.startsWith(sandbox.tempDir)) {
      throw new Error(`Path not in sandbox: ${filePath}`)
    }

    // 确保目录存在
    const dir = path.dirname(resolvedPath)
    await fs.mkdir(dir, { recursive: true })

    // 写入文件
    await fs.writeFile(resolvedPath, content, 'utf-8')
  }

  /**
   * 在沙箱中读取文件
   */
  async readFileInSandbox(
    sandboxId: string,
    filePath: string
  ): Promise<string> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${sandboxId}`)
    }

    // 检查路径是否在沙箱内
    const resolvedPath = path.resolve(sandbox.tempDir, filePath)
    if (!resolvedPath.startsWith(sandbox.tempDir)) {
      throw new Error(`Path not in sandbox: ${filePath}`)
    }

    return await fs.readFile(resolvedPath, 'utf-8')
  }

  /**
   * 列出沙箱中的文件
   */
  async listFilesInSandbox(
    sandboxId: string,
    dirPath: string = '.'
  ): Promise<string[]> {
    const sandbox = this.sandboxes.get(sandboxId)
    if (!sandbox) {
      throw new Error(`Sandbox not found: ${sandboxId}`)
    }

    // 检查路径是否在沙箱内
    const resolvedPath = path.resolve(sandbox.tempDir, dirPath)
    if (!resolvedPath.startsWith(sandbox.tempDir)) {
      throw new Error(`Path not in sandbox: ${dirPath}`)
    }

    const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
    return entries.map(entry => entry.name)
  }

  /**
   * 清理所有沙箱
   */
  async cleanupAll(): Promise<void> {
    for (const [id] of this.sandboxes) {
      await this.destroySandbox(id)
    }
  }
}
