// 工具执行器接口

export interface ToolResult {
  success: boolean
  output: Record<string, unknown>
  error?: string
  durationMs: number
}

export interface ToolExecutor {
  execute(toolId: string, input: Record<string, unknown>): Promise<ToolResult>
  validate(toolId: string, input: Record<string, unknown>): Promise<boolean>
  getSupportedTools(): string[]
}

// HTTP 请求工具执行器
export class HttpToolExecutor implements ToolExecutor {
  private allowedDomains: string[]

  constructor(allowedDomains: string[] = []) {
    this.allowedDomains = allowedDomains
  }

  async execute(toolId: string, input: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      const { url, method, headers, body } = input as {
        url: string
        method: string
        headers?: Record<string, string>
        body?: Record<string, unknown>
      }

      // 检查域名是否允许
      const urlObj = new URL(url)
      if (this.allowedDomains.length > 0 && !this.allowedDomains.includes(urlObj.hostname)) {
        throw new Error(`Domain not allowed: ${urlObj.hostname}`)
      }

      const response = await fetch(url, {
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      const data = await response.json()

      return {
        success: true,
        output: { status: response.status, data, url, method },
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      }
    }
  }

  async validate(toolId: string, input: Record<string, unknown>): Promise<boolean> {
    return 'url' in input && 'method' in input
  }

  getSupportedTools(): string[] {
    return ['http_request', 'api_call']
  }
}

// 代码执行工具执行器
export class CodeExecutor implements ToolExecutor {
  private maxExecutionTimeMs: number

  constructor(maxExecutionTimeMs: number = 30000) {
    this.maxExecutionTimeMs = maxExecutionTimeMs
  }

  async execute(toolId: string, input: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      const { code, language } = input as { code: string; language: string }

      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const fs = await import('fs/promises')
      const path = await import('path')
      const os = await import('os')

      // 创建临时文件
      const tempDir = os.tmpdir()
      const ext = language === 'python' ? '.py' : language === 'javascript' ? '.js' : '.txt'
      const tempFile = path.join(tempDir, `exec-${Date.now()}${ext}`)

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

        const { stdout, stderr } = await execAsync(command, {
          timeout: this.maxExecutionTimeMs,
        })

        return {
          success: true,
          output: { stdout, stderr, language },
          durationMs: Date.now() - startTime,
        }
      } finally {
        await fs.unlink(tempFile)
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      }
    }
  }

  async validate(toolId: string, input: Record<string, unknown>): Promise<boolean> {
    return 'code' in input && 'language' in input
  }

  getSupportedTools(): string[] {
    return ['execute_code', 'run_script']
  }
}

// 文件操作工具执行器
export class FileToolExecutor implements ToolExecutor {
  private allowedRoots: string[]

  constructor(allowedRoots: string[] = []) {
    this.allowedRoots = allowedRoots
  }

  async execute(toolId: string, input: Record<string, unknown>): Promise<ToolResult> {
    const startTime = Date.now()

    try {
      const { operation, path: filePath, content } = input as {
        operation: string
        path: string
        content?: string
      }

      const fs = await import('fs/promises')
      const pathModule = await import('path')

      // 检查路径是否在允许的根目录内
      const resolvedPath = pathModule.resolve(filePath)
      const isAllowed = this.allowedRoots.some(root => {
        const resolvedRoot = pathModule.resolve(root)
        return resolvedPath.startsWith(resolvedRoot)
      })

      if (!isAllowed && this.allowedRoots.length > 0) {
        throw new Error(`Path not allowed: ${filePath}`)
      }

      let output: Record<string, unknown>

      switch (operation) {
        case 'read':
          const readContent = await fs.readFile(resolvedPath, 'utf-8')
          output = { content: readContent, path: filePath, size: readContent.length }
          break

        case 'write':
          const dir = pathModule.dirname(resolvedPath)
          await fs.mkdir(dir, { recursive: true })
          await fs.writeFile(resolvedPath, content || '', 'utf-8')
          output = { success: true, path: filePath, size: (content || '').length }
          break

        case 'delete':
          await fs.unlink(resolvedPath)
          output = { success: true, path: filePath }
          break

        case 'list':
          const entries = await fs.readdir(resolvedPath, { withFileTypes: true })
          const files = entries.map(entry => ({
            name: entry.name,
            isDirectory: entry.isDirectory(),
            isFile: entry.isFile(),
          }))
          output = { files, path: filePath, count: files.length }
          break

        default:
          throw new Error(`Unknown operation: ${operation}`)
      }

      return {
        success: true,
        output,
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      }
    }
  }

  async validate(toolId: string, input: Record<string, unknown>): Promise<boolean> {
    return 'operation' in input && 'path' in input
  }

  getSupportedTools(): string[] {
    return ['file_operation', 'read_file', 'write_file', 'delete_file', 'list_directory']
  }
}
