// Git 执行器

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface GitStatus {
  currentBranch: string
  files: Array<{
    path: string
    status: string
  }>
  ahead: number
  behind: number
}

export interface GitCommitResult {
  success: boolean
  commitHash?: string
  message: string
  error?: string
}

export class GitExecutor {
  private repoPath: string

  constructor(repoPath: string = '.') {
    this.repoPath = repoPath
  }

  /**
   * 获取 Git 状态
   */
  async status(): Promise<GitStatus> {
    try {
      // 获取当前分支
      const { stdout: branchOutput } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        cwd: this.repoPath,
      })
      const currentBranch = branchOutput.trim()

      // 获取文件状态
      const { stdout: statusOutput } = await execAsync('git status --porcelain', {
        cwd: this.repoPath,
      })

      const files = statusOutput
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const status = line.substring(0, 2).trim()
          const path = line.substring(3).trim()
          return { path, status }
        })

      // 获取 ahead/behind 信息
      let ahead = 0
      let behind = 0
      try {
        const { stdout: aheadBehindOutput } = await execAsync(
          'git rev-list --left-right --count HEAD...@{upstream}',
          { cwd: this.repoPath }
        )
        const [aheadStr, behindStr] = aheadBehindOutput.trim().split('\t')
        ahead = parseInt(aheadStr) || 0
        behind = parseInt(behindStr) || 0
      } catch {
        // 没有上游分支
      }

      return {
        currentBranch,
        files,
        ahead,
        behind,
      }
    } catch (error) {
      throw new Error(`Failed to get git status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 添加文件到暂存区
   */
  async add(files: string[]): Promise<void> {
    const filesStr = files.join(' ')
    await execAsync(`git add ${filesStr}`, { cwd: this.repoPath })
  }

  /**
   * 提交更改
   */
  async commit(message: string): Promise<GitCommitResult> {
    try {
      await execAsync(`git commit -m "${message}"`, { cwd: this.repoPath })

      // 获取最新的 commit hash
      const { stdout } = await execAsync('git rev-parse HEAD', { cwd: this.repoPath })
      const commitHash = stdout.trim()

      return {
        success: true,
        commitHash,
        message,
      }
    } catch (error) {
      return {
        success: false,
        message,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 推送到远程
   */
  async push(): Promise<void> {
    await execAsync('git push', { cwd: this.repoPath })
  }

  /**
   * 拉取远程更新
   */
  async pull(): Promise<void> {
    await execAsync('git pull', { cwd: this.repoPath })
  }

  /**
   * 创建新分支
   */
  async createBranch(name: string): Promise<void> {
    await execAsync(`git checkout -b ${name}`, { cwd: this.repoPath })
  }

  /**
   * 切换分支
   */
  async checkout(branch: string): Promise<void> {
    await execAsync(`git checkout ${branch}`, { cwd: this.repoPath })
  }

  /**
   * 合并分支
   */
  async merge(branch: string): Promise<void> {
    await execAsync(`git merge ${branch}`, { cwd: this.repoPath })
  }

  /**
   * 获取提交历史
   */
  async log(options: { limit?: number; oneline?: boolean } = {}): Promise<string[]> {
    const { limit = 10, oneline = true } = options
    const flag = oneline ? '--oneline' : ''
    const { stdout } = await execAsync(`git log ${flag} -n ${limit}`, { cwd: this.repoPath })
    return stdout.split('\n').filter(line => line.trim())
  }

  /**
   * 获取 diff
   */
  async diff(options: { staged?: boolean } = {}): Promise<string> {
    const flag = options.staged ? '--staged' : ''
    const { stdout } = await execAsync(`git diff ${flag}`, { cwd: this.repoPath })
    return stdout
  }

  /**
   * 检查是否有未提交的更改
   */
  async hasUncommittedChanges(): Promise<boolean> {
    const { stdout } = await execAsync('git status --porcelain', { cwd: this.repoPath })
    return stdout.trim().length > 0
  }

  /**
   * 检查是否在 git 仓库中
   */
  async isGitRepository(): Promise<boolean> {
    try {
      await execAsync('git rev-parse --git-dir', { cwd: this.repoPath })
      return true
    } catch {
      return false
    }
  }
}
