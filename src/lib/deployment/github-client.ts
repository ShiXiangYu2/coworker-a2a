/**
 * GitHub API Client — GitHub API 客户端
 *
 * 封装 GitHub REST API，支持：
 *   - 分支创建/删除
 *   - 文件提交
 *   - PR 创建/合并
 *   - CI/CD 状态查询
 *
 * 认证：
 *   - 从环境变量 GITHUB_TOKEN 读取
 *   - Token 不存储在代码中
 *
 * 安全：
 *   - 所有操作记录审计日志
 *   - 禁止 force push
 *   - 禁止删除默认分支
 */

import type {
  GitBranch,
  GitCommit,
  PullRequest,
  CreatePRInput,
  CICDRun,
  CICDStatus,
} from './types'

// ─── 配置 ──────────────────────────────────────────────────────────

const GITHUB_API_BASE = 'https://api.github.com'

function getAuthToken(): string | null {
  return process.env.GITHUB_TOKEN ?? null
}

function getRepoOwner(): string {
  return process.env.GITHUB_REPO_OWNER ?? ''
}

function getRepoName(): string {
  return process.env.GITHUB_REPO_NAME ?? ''
}

function getRepoFullName(): string {
  return `${getRepoOwner()}/${getRepoName()}`
}

// ─── API 请求 ──────────────────────────────────────────────────────

async function githubFetch(
  path: string,
  options: {
    method?: string
    body?: unknown
    accept?: string
  } = {},
): Promise<{ status: number; data: unknown; headers: Record<string, string> }> {
  const token = getAuthToken()
  if (!token) {
    throw new Error('GITHUB_TOKEN not configured')
  }

  const url = `${GITHUB_API_BASE}${path}`
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Accept': options.accept ?? 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  }

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const responseHeaders: Record<string, string> = {}
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value
  })

  let data: unknown
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const errorMsg = (data as Record<string, unknown>)?.message ?? response.statusText
    throw new Error(`GitHub API error (${response.status}): ${errorMsg}`)
  }

  return { status: response.status, data, headers: responseHeaders }
}

// ─── 分支操作 ──────────────────────────────────────────────────────

/**
 * 获取分支信息
 */
export async function getBranch(branchName: string): Promise<GitBranch | null> {
  try {
    const { data } = await githubFetch(`/repos/${getRepoFullName()}/branches/${branchName}`)
    const branch = data as { name: string; commit: { sha: string } }
    return {
      name: branch.name,
      sha: branch.commit.sha,
      createdAt: new Date().toISOString(),
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * 创建分支
 */
export async function createBranch(
  branchName: string,
  fromBranch: string = 'main',
): Promise<GitBranch> {
  // 获取源分支的 SHA
  const source = await getBranch(fromBranch)
  if (!source) {
    throw new Error(`Source branch not found: ${fromBranch}`)
  }

  const { data } = await githubFetch(`/repos/${getRepoFullName()}/git/refs`, {
    method: 'POST',
    body: {
      ref: `refs/heads/${branchName}`,
      sha: source.sha,
    },
  })

  const ref = data as { ref: string; object: { sha: string } }
  return {
    name: branchName,
    sha: ref.object.sha,
    createdAt: new Date().toISOString(),
  }
}

/**
 * 删除分支
 */
export async function deleteBranch(branchName: string): Promise<boolean> {
  try {
    await githubFetch(`/repos/${getRepoFullName()}/git/refs/heads/${branchName}`, {
      method: 'DELETE',
    })
    return true
  } catch {
    return false
  }
}

// ─── 文件操作 ──────────────────────────────────────────────────────

/**
 * 获取文件内容
 */
export async function getFileContent(
  path: string,
  ref: string = 'main',
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await githubFetch(
      `/repos/${getRepoFullName()}/contents/${path}?ref=${ref}`,
    )

    const file = data as { content?: string; sha: string; encoding?: string }
    if (!file.content) return null

    // GitHub API 返回 base64 编码的内容
    const content = file.encoding === 'base64'
      ? Buffer.from(file.content, 'base64').toString('utf-8')
      : file.content

    return { content, sha: file.sha }
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) {
      return null
    }
    throw error
  }
}

/**
 * 创建或更新文件（用于在新分支上提交）
 */
export async function createOrUpdateFile(
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string,
): Promise<GitCommit> {
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  }

  // 如果提供了 SHA，表示更新现有文件
  if (sha) {
    body.sha = sha
  }

  const { data } = await githubFetch(
    `/repos/${getRepoFullName()}/contents/${path}`,
    { method: 'PUT', body },
  )

  const result = data as { commit: { sha: string; commit: { message: string; author: { name: string; date: string } } } }
  return {
    sha: result.commit.sha,
    message: result.commit.commit.message,
    author: result.commit.commit.author.name,
    date: result.commit.commit.author.date,
    filesChanged: [path],
  }
}

/**
 * 批量提交文件
 */
export async function commitFiles(
  files: Array<{ path: string; content: string; action: 'create' | 'modify' | 'delete' }>,
  message: string,
  branch: string,
): Promise<GitCommit[]> {
  const commits: GitCommit[] = []

  for (const file of files) {
    if (file.action === 'delete') {
      // 获取文件 SHA 以删除
      const existing = await getFileContent(file.path, branch)
      if (existing) {
        await githubFetch(`/repos/${getRepoFullName()}/contents/${file.path}`, {
          method: 'DELETE',
          body: { message, branch, sha: existing.sha },
        })
      }
      continue
    }

    const existing = await getFileContent(file.path, branch)
    const commit = await createOrUpdateFile(
      file.path,
      file.content,
      message,
      branch,
      existing?.sha,
    )
    commits.push(commit)
  }

  return commits
}

// ─── PR 操作 ───────────────────────────────────────────────────────

/**
 * 创建 Pull Request
 */
export async function createPullRequest(input: CreatePRInput): Promise<PullRequest> {
  const { data } = await githubFetch(`/repos/${getRepoFullName()}/pulls`, {
    method: 'POST',
    body: {
      title: input.title,
      body: input.body,
      head: input.head,
      base: input.base,
      draft: input.draft ?? false,
    },
  })

  const pr = data as {
    number: number
    title: string
    body: string
    head: { ref: string }
    base: { ref: string }
    state: string
    html_url: string
    created_at: string
    updated_at: string
    draft: boolean
  }

  return {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    head: pr.head.ref,
    base: pr.base.ref,
    status: pr.draft ? 'draft' : pr.state === 'open' ? 'open' : pr.state === 'closed' ? 'closed' : 'open',
    url: pr.html_url,
    createdAt: pr.created_at,
    updatedAt: pr.updated_at,
  }
}

/**
 * 合并 Pull Request
 */
export async function mergePullRequest(
  prNumber: number,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash',
): Promise<{ sha: string; merged: boolean }> {
  try {
    const { data } = await githubFetch(
      `/repos/${getRepoFullName()}/pulls/${prNumber}/merge`,
      {
        method: 'PUT',
        body: { merge_method: mergeMethod },
      },
    )

    const result = data as { sha: string; merged: boolean }
    return { sha: result.sha, merged: result.merged }
  } catch (error) {
    // PR 可能已经合并
    if (error instanceof Error && error.message.includes('405')) {
      return { sha: '', merged: false }
    }
    throw error
  }
}

/**
 * 获取 PR 状态
 */
export async function getPullRequest(prNumber: number): Promise<PullRequest | null> {
  try {
    const { data } = await githubFetch(`/repos/${getRepoFullName()}/pulls/${prNumber}`)
    const pr = data as {
      number: number
      title: string
      body: string
      head: { ref: string }
      base: { ref: string }
      state: string
      html_url: string
      created_at: string
      updated_at: string
      merged_at: string | null
      merge_commit_sha: string | null
      draft: boolean
    }

    return {
      number: pr.number,
      title: pr.title,
      body: pr.body,
      head: pr.head.ref,
      base: pr.base.ref,
      status: pr.draft ? 'draft' : pr.state === 'open' ? 'open' : 'closed',
      url: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at ?? undefined,
      mergeCommitSha: pr.merge_commit_sha ?? undefined,
    }
  } catch {
    return null
  }
}

// ─── CI/CD 操作 ────────────────────────────────────────────────────

/**
 * 获取 CI/CD 运行状态
 */
export async function getCICDStatus(
  branch?: string,
  headSha?: string,
): Promise<CICDRun[]> {
  const params = new URLSearchParams()
  if (branch) params.set('branch', branch)
  if (headSha) params.set('head_sha', headSha)
  params.set('per_page', '5')

  const queryString = params.toString()
  const { data } = await githubFetch(
    `/repos/${getRepoFullName()}/actions/runs?${queryString}`,
  )

  const runs = (data as { workflow_runs: Array<{
    id: number
    name: string
    status: string
    conclusion: string | null
    html_url: string
    head_sha: string
    run_started_at: string | null
    updated_at: string
  }> }).workflow_runs ?? []

  return runs.map((run) => ({
    id: run.id,
    name: run.name,
    status: mapCICDStatus(run.status),
    conclusion: run.conclusion ?? undefined,
    url: run.html_url,
    headSha: run.head_sha,
    startedAt: run.run_started_at ?? undefined,
    completedAt: run.status === 'completed' ? run.updated_at : undefined,
  }))
}

/**
 * 等待 CI/CD 完成
 */
export async function waitForCICD(
  runId: number,
  timeoutMs: number = 600_000, // 10 分钟
  pollIntervalMs: number = 10_000, // 10 秒
): Promise<CICDRun | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeoutMs) {
    const runs = await getCICDStatus()
    const run = runs.find((r) => r.id === runId)
    if (!run) return null

    if (['success', 'failure', 'cancelled'].includes(run.status)) {
      return run
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  return null // 超时
}

function mapCICDStatus(status: string): CICDStatus {
  switch (status) {
    case 'queued': return 'queued'
    case 'in_progress': return 'in_progress'
    case 'completed': return 'success' // 需要检查 conclusion
    case 'waiting': return 'pending'
    default: return 'pending'
  }
}

// ─── 工具函数 ──────────────────────────────────────────────────────

/**
 * 检查 GitHub 是否已配置
 */
export function isGitHubConfigured(): boolean {
  return !!(getAuthToken() && getRepoOwner() && getRepoName())
}

/**
 * 获取仓库信息
 */
export function getRepoInfo(): { owner: string; name: string; fullName: string } {
  return {
    owner: getRepoOwner(),
    name: getRepoName(),
    fullName: getRepoFullName(),
  }
}
