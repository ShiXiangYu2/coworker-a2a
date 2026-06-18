import { describe, expect, it } from 'vitest'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const apiRoot = join(process.cwd(), 'src', 'app', 'api')

function listRoutePaths(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return listRoutePaths(path)
    return name === 'route.ts' ? [relative(apiRoot, path).split('\\').join('/')] : []
  })
}

describe('Sprint 9 API route safety', () => {
  it('does not add execution-semantics collaboration route paths', () => {
    const routePaths = listRoutePaths(apiRoot)
    const sprint9Routes = routePaths.filter((path) =>
      path.includes('collaboration') ||
      path.includes('handoff') ||
      path.includes('a2a/threads') ||
      path.includes('a2a/turns')
    )

    expect(sprint9Routes).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/send-a2a|dispatch|start-agent|auto-continue|execute|run-tool|start-a2a-loop/i),
      ])
    )
    expect(sprint9Routes).toEqual(expect.arrayContaining([
      'collaboration-sessions/[id]/open-record/route.ts',
      'a2a/turns/[id]/approve-record/route.ts',
      'handoffs/[id]/approve-record/route.ts',
      'collaboration-decisions/[id]/approve-record/route.ts',
    ]))
  })
})
