// 执行引擎核心实现

import { randomUUID } from 'node:crypto'
import type {
  ExecutionRequest,
  ExecutionResult,
  ExecutionContext,
  ExecutionAction,
  SandboxConfig,
  SecurityPolicy,
  ExecutionSnapshot,
  SideEffect,
} from './types'

export class ExecutionEngine {
  private sandboxConfig: SandboxConfig
  private securityPolicy: SecurityPolicy
  private snapshots: Map<string, ExecutionSnapshot> = new Map()

  constructor(config?: Partial<SandboxConfig & SecurityPolicy>) {
    this.sandboxConfig = {
      allowedRoots: ['./deliverables', './output', './temp'],
      blockedPatterns: ['DROP TABLE', 'DELETE FROM', 'rm -rf'],
      maxExecutionTimeMs: 30000,
      maxRetries: 3,
      requireApprovalFor: ['write_file', 'delete_file', 'git_push', 'git_commit'],
      ...config,
    }

    this.securityPolicy = {
      allowedDomains: ['api.github.com', 'api.openai.com'],
      blockedPatterns: ['DROP TABLE', 'DELETE FROM', 'eval('],
      maxExecutionTimeMs: 30000,
      maxRetries: 3,
      requireApproval: ['write_file', 'delete_file', 'git_push', 'git_commit'],
      auditLog: true,
      ...config,
    }
  }

  /**
   * 执行任务
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now()
    const resultId = randomUUID()

    try {
      // 1. 安全检查
      await this.securityCheck(request)

      // 2. 创建快照（如果需要）
      if (this.requiresSnapshot(request.action)) {
        await this.createSnapshot(request.context.taskId, `Before ${request.action}`)
      }

      // 3. 执行操作
      const output = await this.executeAction(request)

      // 4. 计算副作用
      const sideEffects = this.calculateSideEffects(request, output)

      // 5. 记录审计日志
      if (this.securityPolicy.auditLog) {
        await this.auditLog(request, 'success', output)
      }

      return {
        id: resultId,
        requestId: request.id,
        status: 'completed',
        output,
        durationMs: Date.now() - startTime,
        sideEffects,
        createdAt: new Date(),
      }
    } catch (error) {
      // 记录错误
      if (this.securityPolicy.auditLog) {
        await this.auditLog(request, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' })
      }

      return {
        id: resultId,
        requestId: request.id,
        status: 'failed',
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
        sideEffects: [],
        createdAt: new Date(),
      }
    }
  }

  /**
   * 安全检查
   */
  private async securityCheck(request: ExecutionRequest): Promise<void> {
    // 检查是否需要审批
    if (request.requiresApproval || this.securityPolicy.requireApproval.includes(request.action)) {
      throw new Error(`Action ${request.action} requires human approval`)
    }

    // 检查输入是否包含危险模式
    const inputStr = JSON.stringify(request.input)
    for (const pattern of this.securityPolicy.blockedPatterns) {
      if (inputStr.includes(pattern)) {
        throw new Error(`Input contains blocked pattern: ${pattern}`)
      }
    }

    // 检查执行时间限制
    if (request.timeoutMs && request.timeoutMs > this.securityPolicy.maxExecutionTimeMs) {
      throw new Error(`Timeout ${request.timeoutMs}ms exceeds maximum ${this.securityPolicy.maxExecutionTimeMs}ms`)
    }
  }

  /**
   * 执行操作
   */
  private async executeAction(request: ExecutionRequest): Promise<Record<string, unknown>> {
    const { action, input } = request

    switch (action) {
      case 'read_file':
        return this.readFile(input.path as string)
      case 'write_file':
        return this.writeFile(input.path as string, input.content as string)
      case 'delete_file':
        return this.deleteFile(input.path as string)
      case 'list_directory':
        return this.listDirectory(input.path as string)
      case 'search_files':
        return this.searchFiles(input.pattern as string)
      case 'git_status':
        return this.gitStatus()
      case 'git_add':
        return this.gitAdd(input.files as string[])
      case 'git_commit':
        return this.gitCommit(input.message as string)
      case 'execute_code':
        return this.executeCode(input.code as string, input.language as string)
      case 'call_api':
        return this.callApi(input.url as string, input.method as string, input.body as Record<string, unknown>)
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  /**
   * 读取文件
   */
  private async readFile(path: string): Promise<Record<string, unknown>> {
    const fs = await import('fs/promises')
    const content = await fs.readFile(path, 'utf-8')
    return { content, path, size: content.length }
  }

  /**
   * 写入文件
   */
  private async writeFile(path: string, content: string): Promise<Record<string, unknown>> {
    const fs = await import('fs/promises')
    const pathModule = await import('path')

    // 检查路径是否在允许的根目录内
    const resolvedPath = pathModule.resolve(path)
    const isAllowed = this.sandboxConfig.allowedRoots.some(root => {
      const resolvedRoot = pathModule.resolve(root)
      return resolvedPath.startsWith(resolvedRoot)
    })

    if (!isAllowed) {
      throw new Error(`Path not allowed: ${path}`)
    }

    // 确保目录存在
    const dir = pathModule.dirname(resolvedPath)
    await fs.mkdir(dir, { recursive: true })

    // 写入文件
    await fs.writeFile(resolvedPath, content, 'utf-8')

    return { success: true, path, size: content.length }
  }

  /**
   * 删除文件
   */
  private async deleteFile(path: string): Promise<Record<string, unknown>> {
    const fs = await import('fs/promises')
    await fs.unlink(path)
    return { success: true, path }
  }

  /**
   * 列出目录
   */
  private async listDirectory(path: string): Promise<Record<string, unknown>> {
    const fs = await import('fs/promises')
    const entries = await fs.readdir(path, { withFileTypes: true })
    const files = entries.map(entry => ({
      name: entry.name,
      isDirectory: entry.isDirectory(),
      isFile: entry.isFile(),
    }))
    return { files, path, count: files.length }
  }

  /**
   * 搜索文件
   */
  private async searchFiles(pattern: string): Promise<Record<string, unknown>> {
    const { glob } = await import('glob')
    const files = await glob(pattern)
    return { files, pattern, count: files.length }
  }

  /**
   * Git 状态
   */
  private async gitStatus(): Promise<Record<string, unknown>> {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const { stdout } = await execAsync('git status --porcelain')
    const files = stdout.split('\n').filter(line => line.trim())

    return { files, count: files.length }
  }

  /**
   * Git 添加
   */
  private async gitAdd(files: string[]): Promise<Record<string, unknown>> {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const filesStr = files.join(' ')
    await execAsync(`git add ${filesStr}`)

    return { success: true, files }
  }

  /**
   * Git 提交
   */
  private async gitCommit(message: string): Promise<Record<string, unknown>> {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    await execAsync(`git commit -m "${message}"`)

    return { success: true, message }
  }

  /**
   * 执行代码
   */
  private async executeCode(code: string, language: string): Promise<Record<string, unknown>> {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)

    const fs = await import('fs/promises')
    const path = await import('path')
    const os = await import('os')

    // 创建临时文件
    const tempDir = os.tmpdir()
    const ext = language === 'python' ? '.py' : language === 'javascript' ? '.js' : '.txt'
    const tempFile = path.join(tempDir, `exec-${randomUUID()}${ext}`)

    await fs.writeFile(tempFile, code, 'utf-8')

    try {
      let command: string
      switch (language) {
        case 'python':
          command = `python ${tempFile}`
          break
        case 'javascript':
          command = `node ${tempFile}`
          break
        case 'shell':
          command = `bash ${tempFile}`
          break
        default:
          throw new Error(`Unsupported language: ${language}`)
      }

      const { stdout, stderr } = await execAsync(command, { timeout: this.securityPolicy.maxExecutionTimeMs })

      return { stdout, stderr, language, success: true }
    } finally {
      await fs.unlink(tempFile)
    }
  }

  /**
   * 调用 API
   */
  private async callApi(
    url: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 检查域名是否允许
    const urlObj = new URL(url)
    if (!this.securityPolicy.allowedDomains.includes(urlObj.hostname)) {
      throw new Error(`Domain not allowed: ${urlObj.hostname}`)
    }

    const response = await fetch(url, {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    const data = await response.json()

    return { status: response.status, data, url, method }
  }

  /**
   * 检查是否需要快照
   */
  private requiresSnapshot(action: ExecutionAction): boolean {
    return ['write_file', 'delete_file', 'git_commit'].includes(action)
  }

  /**
   * 创建快照
   */
  private async createSnapshot(taskId: string, description: string): Promise<ExecutionSnapshot> {
    const snapshot: ExecutionSnapshot = {
      id: randomUUID(),
      taskId,
      timestamp: new Date(),
      state: {}, // TODO: 捕获当前状态
      description,
    }

    this.snapshots.set(snapshot.id, snapshot)
    return snapshot
  }

  /**
   * 计算副作用
   */
  private calculateSideEffects(
    request: ExecutionRequest,
    output: Record<string, unknown>
  ): SideEffect[] {
    const sideEffects: SideEffect[] = []

    switch (request.action) {
      case 'write_file':
        sideEffects.push({
          type: 'file_write',
          target: request.input.path as string,
          description: `Wrote file: ${request.input.path}`,
          reversible: true,
        })
        break
      case 'delete_file':
        sideEffects.push({
          type: 'file_delete',
          target: request.input.path as string,
          description: `Deleted file: ${request.input.path}`,
          reversible: false,
        })
        break
      case 'git_commit':
        sideEffects.push({
          type: 'git_commit',
          target: 'repository',
          description: `Created commit: ${request.input.message}`,
          reversible: true,
        })
        break
      case 'execute_code':
        sideEffects.push({
          type: 'code_execution',
          target: 'sandbox',
          description: `Executed ${request.input.language} code`,
          reversible: false,
        })
        break
      case 'call_api':
        sideEffects.push({
          type: 'api_call',
          target: request.input.url as string,
          description: `Called API: ${request.input.url}`,
          reversible: false,
        })
        break
    }

    return sideEffects
  }

  /**
   * 审计日志
   */
  private async auditLog(
    request: ExecutionRequest,
    status: 'success' | 'failed',
    output: Record<string, unknown>
  ): Promise<void> {
    // TODO: 实现审计日志存储
    console.log(`[ExecutionEngine] ${status}: ${request.action} - ${JSON.stringify(output).substring(0, 100)}`)
  }
}
