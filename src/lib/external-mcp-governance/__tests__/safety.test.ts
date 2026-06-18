import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const forbiddenRouteTerms = [
  '/connect',
  '/connect-mcp',
  '/call-api',
  '/send',
  '/send-message',
  '/sync',
  '/sync-now',
  '/invoke',
  '/invoke-mcp',
  '/create-webhook',
  '/dispatch',
  '/execute',
  '/run-integration',
  '/external-call',
  '/webhook-dispatch',
  '/create-worker',
  '/enqueue',
  '/retry',
  '/replay',
  '/rollback',
  '/resume-execution',
]

const forbiddenLabels = [
  'Connect MCP',
  'Call API',
  'Send Message',
  'Sync Now',
  'Invoke Tool',
  'Create Webhook',
  'Dispatch',
  'Execute',
  'Run Integration',
  'Auto Send',
  'Auto Sync',
  'Retry',
  'Replay',
  'Rollback',
  'Resume Execution',
]

describe('Sprint 13 static safety checks', () => {
  it('does not add forbidden external execution API route semantics', () => {
    const routePaths = collectFiles(join(process.cwd(), 'src', 'app', 'api'))
      .filter((file) => file.endsWith('route.ts'))
      .map((file) => file.replaceAll('\\', '/').toLowerCase())

    for (const routePath of routePaths) {
      if (!routePath.includes('external-action-proposals') &&
        !routePath.includes('external-integration-profiles') &&
        !routePath.includes('mcp-connection-profiles') &&
        !routePath.includes('integration-risk-assessments') &&
        !routePath.includes('external-action-review-records') &&
        !routePath.includes('integration-audit-policy')) {
        continue
      }
      for (const term of forbiddenRouteTerms) {
        expect(routePath).not.toContain(term)
      }
    }
  })

  it('does not show forbidden Sprint 13 UI labels', () => {
    const uiFiles = [join(process.cwd(), 'src', 'components', 'chat', 'external-mcp-governance-card.tsx')]

    for (const file of uiFiles) {
      const source = readFileSync(file, 'utf8')
      for (const label of forbiddenLabels) {
        expect(source).not.toContain(label)
      }
    }
  })

  it('does not introduce forbidden execution models', () => {
    const schema = readFileSync(join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
    for (const model of ['ExternalApiCall', 'McpSession', 'WebhookDispatch', 'IntegrationRun', 'ExternalSyncRun', 'MessageSendRun', 'Worker', 'Queue']) {
      expect(schema).not.toContain(`model ${model}`)
    }
  })
})

function collectFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    return statSync(path).isDirectory() ? collectFiles(path) : [path]
  })
}
