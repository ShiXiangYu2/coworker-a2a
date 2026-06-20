/**
 * Rollback Mechanism — 回滚机制
 *
 * 支持事务性操作：如果任何步骤失败，自动回滚所有已完成的步骤。
 *
 * 使用方式：
 *   const ctx = createTransaction()
 *   ctx.addAction('step1', () => doStep1())
 *   ctx.addAction('step2', () => doStep2())
 *   await executeTransaction(ctx)
 */

import type { RollbackAction, TransactionContext } from './types'

// ─── 事务上下文 ────────────────────────────────────────────────────

/**
 * 创建事务上下文
 */
export function createTransaction(): TransactionContext {
  return {
    actions: [],
    rolledBack: false,
  }
}

/**
 * 添加回滚操作
 */
export function addRollbackAction(
  ctx: TransactionContext,
  id: string,
  description: string,
  execute: () => Promise<void>,
): void {
  ctx.actions.push({ id, description, execute })
}

/**
 * 执行事务
 *
 * 按顺序执行所有操作，如果任何操作失败，自动回滚已完成的操作。
 */
export async function executeTransaction<T>(
  ctx: TransactionContext,
  operations: Array<() => Promise<T>>,
): Promise<T[]> {
  const results: T[] = []
  const completedActions: RollbackAction[] = []

  try {
    for (const operation of operations) {
      const result = await operation()
      results.push(result)

      // 将对应的回滚操作标记为已完成
      if (ctx.actions.length > completedActions.length) {
        completedActions.push(ctx.actions[completedActions.length])
      }
    }

    return results
  } catch (error) {
    // 执行回滚（逆序）
    console.error(`[Rollback] Transaction failed, rolling back ${completedActions.length} actions`)
    await rollback(ctx, completedActions)
    throw error
  }
}

/**
 * 执行单步操作（带自动回滚）
 */
export async function executeWithRollback<T>(
  ctx: TransactionContext,
  operation: () => Promise<T>,
): Promise<T> {
  const completedActions: RollbackAction[] = []

  try {
    const result = await operation()

    // 将对应的回滚操作标记为已完成
    if (ctx.actions.length > completedActions.length) {
      completedActions.push(ctx.actions[completedActions.length])
    }

    return result
  } catch (error) {
    // 执行回滚
    await rollback(ctx, completedActions)
    throw error
  }
}

/**
 * 执行回滚
 */
async function rollback(
  ctx: TransactionContext,
  completedActions: RollbackAction[],
): Promise<void> {
  if (ctx.rolledBack) return // 已经回滚过
  ctx.rolledBack = true

  // 逆序执行回滚操作
  for (let i = completedActions.length - 1; i >= 0; i--) {
    const action = completedActions[i]
    try {
      console.log(`[Rollback] Rolling back: ${action.description}`)
      await action.execute()
    } catch (rollbackError) {
      // 回滚失败不影响主流程，但记录日志
      console.error(`[Rollback] Failed to rollback "${action.description}":`, rollbackError)
    }
  }
}

// ─── 便捷回滚操作 ──────────────────────────────────────────────────

/**
 * 创建文件回滚操作
 */
export function createFileRollback(
  filePath: string,
  originalContent: string | null,
): RollbackAction {
  return {
    id: `file-${filePath}`,
    description: `Restore file: ${filePath}`,
    execute: async () => {
      const fs = await import('node:fs/promises')
      if (originalContent === null) {
        // 文件是新建的，删除它
        await fs.unlink(filePath).catch(() => {})
      } else {
        // 文件是修改的，恢复原内容
        await fs.writeFile(filePath, originalContent, 'utf-8')
      }
    },
  }
}

/**
 * 创建数据库回滚操作
 */
export function createDbRollback(
  tableName: string,
  recordId: string,
  beforeState: Record<string, unknown>,
): RollbackAction {
  return {
    id: `db-${tableName}-${recordId}`,
    description: `Restore ${tableName} record ${recordId}`,
    execute: async () => {
      const { prisma } = await import('@/lib/prisma')
      const client = (prisma as unknown as Record<string, { update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown> }>)[tableName]
      if (client) {
        await client.update({
          where: { id: recordId },
          data: beforeState,
        })
      }
    },
  }
}
