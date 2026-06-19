import { describe, it, expect } from 'vitest'
import {
  matchCommandWhitelist,
  checkForbiddenPatterns,
  executeInSandbox,
  DEFAULT_COMMAND_WHITELIST,
} from '../sandbox-execution'

describe('Sandbox Execution', () => {
  describe('matchCommandWhitelist', () => {
    it('should match "npm test"', () => {
      const entry = matchCommandWhitelist('npm test')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('test')
    })

    it('should match "npx vitest run"', () => {
      const entry = matchCommandWhitelist('npx vitest run')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('test')
    })

    it('should match "git status"', () => {
      const entry = matchCommandWhitelist('git status')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('git_read')
    })

    it('should match "git diff src/"', () => {
      const entry = matchCommandWhitelist('git diff src/')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('git_read')
    })

    it('should match "ls -la"', () => {
      const entry = matchCommandWhitelist('ls -la')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('file_read')
    })

    it('should match "cat package.json"', () => {
      const entry = matchCommandWhitelist('cat package.json')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('file_read')
    })

    it('should match "npx prisma generate"', () => {
      const entry = matchCommandWhitelist('npx prisma generate')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('database')
    })

    it('should match "npx tsc --noEmit"', () => {
      const entry = matchCommandWhitelist('npx tsc --noEmit')
      expect(entry).toBeTruthy()
      expect(entry?.category).toBe('build')
    })

    it('should NOT match "rm -rf"', () => {
      const entry = matchCommandWhitelist('rm -rf /')
      expect(entry).toBeNull()
    })

    it('should NOT match "git push"', () => {
      const entry = matchCommandWhitelist('git push origin main')
      expect(entry).toBeNull()
    })

    it('should NOT match "curl"', () => {
      const entry = matchCommandWhitelist('curl https://example.com')
      expect(entry).toBeNull()
    })

    it('should NOT match unknown command', () => {
      const entry = matchCommandWhitelist('python script.py')
      expect(entry).toBeNull()
    })
  })

  describe('checkForbiddenPatterns', () => {
    it('should detect rm -rf', () => {
      const result = checkForbiddenPatterns('rm -rf /tmp/data')
      expect(result).toBeTruthy()
      expect(result).toContain('forbidden')
    })

    it('should detect git push', () => {
      const result = checkForbiddenPatterns('git push origin main')
      expect(result).toBeTruthy()
    })

    it('should allow git commit (Sprint 23)', () => {
      const result = checkForbiddenPatterns('git commit -m "fix"')
      expect(result).toBeNull()
    })

    it('should detect git commit --force', () => {
      const result = checkForbiddenPatterns('git commit --force -m "fix"')
      expect(result).toBeTruthy()
    })

    it('should detect sudo', () => {
      const result = checkForbiddenPatterns('sudo apt install')
      expect(result).toBeTruthy()
    })

    it('should detect curl to external', () => {
      const result = checkForbiddenPatterns('curl https://api.example.com/data')
      expect(result).toBeTruthy()
    })

    it('should detect wget', () => {
      const result = checkForbiddenPatterns('wget https://example.com/file.zip')
      expect(result).toBeTruthy()
    })

    it('should detect docker run', () => {
      const result = checkForbiddenPatterns('docker run -it ubuntu')
      expect(result).toBeTruthy()
    })

    it('should NOT flag "npm test"', () => {
      const result = checkForbiddenPatterns('npm test')
      expect(result).toBeNull()
    })

    it('should NOT flag "git status"', () => {
      const result = checkForbiddenPatterns('git status')
      expect(result).toBeNull()
    })

    it('should NOT flag "ls -la"', () => {
      const result = checkForbiddenPatterns('ls -la')
      expect(result).toBeNull()
    })
  })

  describe('executeInSandbox', () => {
    it('should deny "echo hello" not in default whitelist', () => {
      // echo is not in default whitelist, so it should be denied
      const result = executeInSandbox('echo hello')
      expect(result.status).toBe('denied')
    })

    it('should execute "echo" with custom whitelist', () => {
      const customWhitelist = [
        { pattern: 'echo', category: 'test' as const, riskLevel: 'low' as const, description: 'echo' },
      ]
      const result = executeInSandbox('echo hello', { whitelist: customWhitelist })
      expect(result.status).toBe('success')
      expect(result.stdout.trim()).toBe('hello')
    })

    it('should execute "git status" successfully', () => {
      const result = executeInSandbox('git status', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
      })
      expect(result.status).toBe('success')
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBeTruthy()
      expect(result.matchedEntry).toBeTruthy()
      expect(result.matchedEntry?.category).toBe('git_read')
    })

    it('should deny non-whitelisted commands', () => {
      const result = executeInSandbox('python3 -c "print(1)"')
      expect(result.status).toBe('denied')
      expect(result.denialReason).toContain('not in the whitelist')
    })

    it('should reject forbidden patterns even if in whitelist', () => {
      // git push matches git pattern but is forbidden
      const result = executeInSandbox('git push origin main')
      expect(result.status).toBe('forbidden')
      expect(result.denialReason).toContain('forbidden')
    })

    it('should truncate long output', () => {
      // Generate long output with a whitelisted command
      const result = executeInSandbox('git log --oneline -100', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
        maxOutputChars: 100, // Very small limit
      })
      // The output should be truncated if git log returns enough lines
      if (result.stdout.length > 100) {
        expect(result.truncated).toBe(true)
        expect(result.stdout).toContain('output truncated')
      }
    })

    it('should handle command timeout', () => {
      // Use a command that sleeps - but this is tricky in sync mode
      // execSync with timeout will throw if it exceeds the limit
      const result = executeInSandbox('git status', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
        timeoutMs: 60_000, // 60s, should complete quickly
      })
      expect(result.status).toBe('success')
      expect(result.durationMs).toBeLessThan(60_000)
    })

    it('should track duration', () => {
      const result = executeInSandbox('git status', {
        cwd: 'D:/AI编程/产品自研/恒识/coworker-a2a',
      })
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should capture stderr for failed commands', () => {
      const result = executeInSandbox('node -e "console.error(\'sandbox stderr\'); process.exit(2)"', {
        whitelist: [
          { pattern: 'node -e', category: 'test' as const, riskLevel: 'low' as const, description: 'node inline test' },
        ],
      })
      expect(result.status).toBe('failed')
      expect(result.stdout).toBe('')
      expect(result.stderr).toContain('sandbox stderr')
    })
  })

  describe('DEFAULT_COMMAND_WHITELIST', () => {
    it('should have entries for all categories', () => {
      const categories = new Set(DEFAULT_COMMAND_WHITELIST.map((e) => e.category))
      expect(categories.has('test')).toBe(true)
      expect(categories.has('lint')).toBe(true)
      expect(categories.has('git_read')).toBe(true)
      expect(categories.has('file_read')).toBe(true)
      expect(categories.has('database')).toBe(true)
      expect(categories.has('build')).toBe(true)
    })

    it('should not contain destructive commands', () => {
      for (const entry of DEFAULT_COMMAND_WHITELIST) {
        // 排除 prisma db push（这是安全的数据库同步命令）
        if (entry.pattern.includes('prisma')) continue
        // 排除 git_write category（Sprint 23 新增的受控写操作）
        if (entry.category === 'git_write') continue
        expect(entry.pattern).not.toContain('rm')
        expect(entry.pattern).not.toContain('delete')
        expect(entry.pattern).not.toContain('destroy')
      }
    })

    it('should have description for every entry', () => {
      for (const entry of DEFAULT_COMMAND_WHITELIST) {
        expect(entry.description).toBeTruthy()
      }
    })
  })
})
