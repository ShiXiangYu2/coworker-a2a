import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenRouteTerms = [
  '/apply',
  '/apply-patch',
  '/write-file',
  '/format',
  '/run-shell',
  '/run-command',
  '/run-git',
  '/git-commit',
  '/git-push',
  '/git-merge',
  '/git-checkout',
  '/git-rebase',
  '/create-pr',
  '/open-pr',
  '/merge-pr',
  '/deploy',
  '/delete',
  '/external',
  '/mcp',
  '/browser',
  '/retry',
  '/replay',
  '/rollback',
  '/resume-execution',
  '/auto-apply',
]

const forbiddenLabels = [
  'Apply Patch',
  'Write File',
  'Format',
  'Run Git',
  'Commit',
  'Push',
  'Create PR',
  'Deploy',
  'Delete',
  'Merge',
  'Auto Apply',
  'Rollback',
  'Replay',
  'Retry Automatically',
  'Resume Execution',
]

describe('Sprint 12 static safety checks', () => {
  it('does not add forbidden execution API route semantics', () => {
    const routePaths = collectFiles(join(process.cwd(), 'src', 'app', 'api'))
      .filter((file) => file.endsWith('route.ts'))
      .map((file) => file.replaceAll('\\', '/').toLowerCase())

    for (const routePath of routePaths) {
      if (!routePath.includes('file-change-proposals') &&
        !routePath.includes('patch-drafts') &&
        !routePath.includes('git-change-plans') &&
        !routePath.includes('pull-request-plans') &&
        !routePath.includes('review-patch-records')) {
        continue
      }
      if (routePath.includes('/external-action-proposals/')) continue
      for (const term of forbiddenRouteTerms) {
        expect(routePath).not.toContain(term)
      }
    }
  })

  it('does not show forbidden Sprint 12 UI labels', () => {
    const uiFiles = collectFiles(join(process.cwd(), 'src', 'components', 'chat'))
      .filter((file) => file.endsWith('.tsx'))

    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8')
      for (const label of forbiddenLabels) {
        expect(source).not.toContain(label)
      }
    }
  })
})

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? collectFiles(path) : [path]
  })
}
