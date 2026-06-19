/**
 * Tool Registry 增强功能测试
 *
 * 覆盖：CORE_TOOLS、动态注册、Agent 权限过滤、按需发现
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  CORE_TOOLS,
  AGENT_DISALLOWED_TOOLS,
  getAllTools,
  getCoreTools,
  getDeferredTools,
  getToolById,
  findToolByIdOrName,
  getToolsForAgent,
  getCoreToolsForAgent,
  isToolAllowedForAgent,
  getToolsByCategory,
  registerTool,
  unregisterTool,
  registerTools,
} from '../registry'
import type { ToolDefinition } from '../types'

// ─── 测试工具工厂 ──────────────────────────────────────────────────

function makeTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  return {
    id: 'test.tool',
    name: 'test.tool',
    displayName: 'Test Tool',
    description: 'A test tool',
    category: 'internal_noop',
    version: 'test',
    inputSchema: { type: 'object', properties: {} },
    riskLevel: 'low',
    isReadOnly: true,
    isDestructive: false,
    isOpenWorld: false,
    isCore: false,
    requiresHumanConfirmation: false,
    permissionProfileRef: 'default-deny-sprint-6',
    enabled: true,
    sprint6Mode: 'proposal_only',
    createdAt: '2026-06-19T00:00:00.000Z',
    updatedAt: '2026-06-19T00:00:00.000Z',
    ...overrides,
  }
}

// ─── CORE_TOOLS 测试 ──────────────────────────────────────────────

describe('CORE_TOOLS', () => {
  it('包含已知的核心工具 ID', () => {
    expect(CORE_TOOLS.has('write.sandbox_deliverable')).toBe(true)
    expect(CORE_TOOLS.has('noop.note')).toBe(true)
    expect(CORE_TOOLS.has('read_simulated.project_summary')).toBe(true)
    expect(CORE_TOOLS.has('read.project_context')).toBe(true)
  })

  it('不包含禁用的工具', () => {
    expect(CORE_TOOLS.has('command.shell')).toBe(false)
  })
})

// ─── AGENT_DISALLOWED_TOOLS 测试 ─────────────────────────────────

describe('AGENT_DISALLOWED_TOOLS', () => {
  it('是可扩展的 Set', () => {
    expect(AGENT_DISALLOWED_TOOLS).toBeInstanceOf(Set)
    // 当前为空（Sprint 6 暂无禁用工具）
    // 未来添加 Agent 递归保护时会扩展
  })
})

// ─── getAllTools 测试 ─────────────────────────────────────────────

describe('getAllTools', () => {
  it('返回静态工具列表', () => {
    const tools = getAllTools()
    expect(tools.length).toBeGreaterThanOrEqual(5)
  })

  it('包含静态注册的工具', () => {
    const tools = getAllTools()
    const ids = tools.map((t) => t.id)
    expect(ids).toContain('write.sandbox_deliverable')
    expect(ids).toContain('noop.note')
  })
})

// ─── getCoreTools 测试 ────────────────────────────────────────────

describe('getCoreTools', () => {
  it('返回 isCore=true 或在 CORE_TOOLS 白名单中的工具', () => {
    const coreTools = getCoreTools()
    expect(coreTools.length).toBeGreaterThanOrEqual(4)

    for (const tool of coreTools) {
      expect(tool.isCore === true || CORE_TOOLS.has(tool.id)).toBe(true)
    }
  })
})

// ─── getDeferredTools 测试 ────────────────────────────────────────

describe('getDeferredTools', () => {
  it('返回非核心且不在 CORE_TOOLS 白名单中的工具', () => {
    const deferred = getDeferredTools()
    for (const tool of deferred) {
      expect(tool.isCore).not.toBe(true)
      expect(CORE_TOOLS.has(tool.id)).toBe(false)
    }
  })

  it('command.shell 是非核心工具', () => {
    const deferred = getDeferredTools()
    const shellTool = deferred.find((t) => t.id === 'command.shell')
    expect(shellTool).toBeDefined()
  })
})

// ─── getToolById 测试 ─────────────────────────────────────────────

describe('getToolById', () => {
  it('按 ID 找到已有工具', () => {
    const tool = getToolById('noop.note')
    expect(tool).toBeDefined()
    expect(tool?.id).toBe('noop.note')
  })

  it('找不到不存在的工具返回 undefined', () => {
    const tool = getToolById('nonexistent.tool')
    expect(tool).toBeUndefined()
  })
})

// ─── findToolByIdOrName 测试 ──────────────────────────────────────

describe('findToolByIdOrName', () => {
  it('按 ID 查找', () => {
    const tool = findToolByIdOrName('noop.note')
    expect(tool?.id).toBe('noop.note')
  })

  it('按名称查找（不区分大小写）', () => {
    const tool = findToolByIdOrName('NOOP.NOTE')
    expect(tool?.id).toBe('noop.note')
  })

  it('找不到返回 undefined', () => {
    const tool = findToolByIdOrName('ghost.tool')
    expect(tool).toBeUndefined()
  })
})

// ─── 动态注册测试 ─────────────────────────────────────────────────

describe('动态注册', () => {
  beforeEach(() => {
    // 清理测试注册的工具
    unregisterTool('test.dynamic_tool')
    unregisterTool('test.batch_1')
    unregisterTool('test.batch_2')
  })

  it('registerTool 添加新工具', () => {
    const testTool = makeTool({ id: 'test.dynamic_tool', name: 'test.dynamic_tool' })
    registerTool(testTool)

    const found = getToolById('test.dynamic_tool')
    expect(found).toBeDefined()
    expect(found?.id).toBe('test.dynamic_tool')
  })

  it('unregisterTool 移除工具', () => {
    const testTool = makeTool({ id: 'test.dynamic_tool', name: 'test.dynamic_tool' })
    registerTool(testTool)
    expect(getToolById('test.dynamic_tool')).toBeDefined()

    const removed = unregisterTool('test.dynamic_tool')
    expect(removed).toBe(true)
    expect(getToolById('test.dynamic_tool')).toBeUndefined()
  })

  it('unregisterTool 对不存在的工具返回 false', () => {
    const removed = unregisterTool('nonexistent.tool')
    expect(removed).toBe(false)
  })

  it('registerTools 批量注册', () => {
    registerTools([
      makeTool({ id: 'test.batch_1', name: 'test.batch_1' }),
      makeTool({ id: 'test.batch_2', name: 'test.batch_2' }),
    ])

    expect(getToolById('test.batch_1')).toBeDefined()
    expect(getToolById('test.batch_2')).toBeDefined()
  })

  it('重复注册覆盖已有工具', () => {
    const v1 = makeTool({ id: 'test.dynamic_tool', version: 'v1' })
    const v2 = makeTool({ id: 'test.dynamic_tool', version: 'v2' })
    registerTool(v1)
    registerTool(v2)

    const found = getToolById('test.dynamic_tool')
    expect(found?.version).toBe('v2')
  })

  it('动态注册的工具出现在 getAllTools 中', () => {
    const testTool = makeTool({ id: 'test.dynamic_tool', name: 'test.dynamic_tool' })
    registerTool(testTool)

    const all = getAllTools()
    const found = all.find((t) => t.id === 'test.dynamic_tool')
    expect(found).toBeDefined()
  })
})

// ─── Agent 权限过滤测试 ───────────────────────────────────────────

describe('getToolsForAgent', () => {
  it('返回所有 enabled 且未被禁用的工具', () => {
    const elonTools = getToolsForAgent('elon')
    expect(elonTools.length).toBeGreaterThanOrEqual(4)

    for (const tool of elonTools) {
      expect(tool.enabled).toBe(true)
      expect(AGENT_DISALLOWED_TOOLS.has(tool.id)).toBe(false)
    }
  })

  it('过滤 disabled 工具', () => {
    const tools = getToolsForAgent('elon')
    const shellTool = tools.find((t) => t.id === 'command.shell')
    expect(shellTool).toBeUndefined() // command.shell is disabled
  })

  it('过滤 Agent 不允许使用的工具', () => {
    // 先注册一个只允许 linus 的工具
    const linusOnly = makeTool({
      id: 'test.linus_only',
      name: 'test.linus_only',
      allowedAgentIds: ['linus'],
    })
    registerTool(linusOnly)

    const elonTools = getToolsForAgent('elon')
    const linusTools = getToolsForAgent('linus')

    expect(elonTools.find((t) => t.id === 'test.linus_only')).toBeUndefined()
    expect(linusTools.find((t) => t.id === 'test.linus_only')).toBeDefined()

    unregisterTool('test.linus_only')
  })
})

// ─── getCoreToolsForAgent 测试 ────────────────────────────────────

describe('getCoreToolsForAgent', () => {
  it('返回指定 Agent 的核心工具', () => {
    const coreTools = getCoreToolsForAgent('jobs')
    expect(coreTools.length).toBeGreaterThanOrEqual(4)

    for (const tool of coreTools) {
      expect(tool.enabled).toBe(true)
      expect(AGENT_DISALLOWED_TOOLS.has(tool.id)).toBe(false)
      expect(tool.isCore === true || CORE_TOOLS.has(tool.id)).toBe(true)
    }
  })
})

// ─── isToolAllowedForAgent 测试 ───────────────────────────────────

describe('isToolAllowedForAgent', () => {
  it('允许 Agent 使用核心工具', () => {
    expect(isToolAllowedForAgent('noop.note', 'elon')).toBe(true)
  })

  it('拒绝 Agent 使用禁用工具', () => {
    expect(isToolAllowedForAgent('command.shell', 'elon')).toBe(false)
  })

  it('拒绝 Agent 使用不在 allowedAgentIds 中的工具', () => {
    const linusOnly = makeTool({
      id: 'test.linus_only',
      name: 'test.linus_only',
      allowedAgentIds: ['linus'],
    })
    registerTool(linusOnly)

    expect(isToolAllowedForAgent('test.linus_only', 'linus')).toBe(true)
    expect(isToolAllowedForAgent('test.linus_only', 'elon')).toBe(false)

    unregisterTool('test.linus_only')
  })

  it('不存在的工具返回 false', () => {
    expect(isToolAllowedForAgent('ghost.tool', 'elon')).toBe(false)
  })
})

// ─── getToolsByCategory 测试 ──────────────────────────────────────

describe('getToolsByCategory', () => {
  it('返回指定类别的工具', () => {
    const noopTools = getToolsByCategory('internal_noop')
    expect(noopTools.length).toBeGreaterThanOrEqual(1)
    expect(noopTools.every((t) => t.category === 'internal_noop')).toBe(true)
  })

  it('返回空数组当没有匹配工具', () => {
    const tools = getToolsByCategory('browser')
    expect(tools).toEqual([])
  })
})
