/**
 * Knowledge Types — 系统经验库类型定义
 *
 * 知识层不只保存文本摘要和候选记忆，还接纳：
 *   - 高质量 workflow 模板
 *   - 可复用 execution plan
 *   - 常见判断模式
 *   - 已关闭债务案例
 *   - 失败模式与修复套路
 *   - 高价值 evidence snapshot
 */

// ─── 知识类型 ──────────────────────────────────────────────────────

export type KnowledgeType =
  | 'workflow_template'      // 工作流模板
  | 'execution_plan'         // 执行计划
  | 'judgment_pattern'       // 判断模式
  | 'debt_case'              // 债务案例
  | 'failure_pattern'        // 失败模式
  | 'fix_pattern'            // 修复套路
  | 'evidence_snapshot'      // Evidence 快照
  | 'best_practice'          // 最佳实践
  | 'lesson_learned'         // 经验教训
  | 'tool_usage_pattern'     // 工具使用模式

// ─── 知识条目 ──────────────────────────────────────────────────────

export interface KnowledgeEntry {
  id: string
  type: KnowledgeType
  title: string
  content: string
  /** 标签 */
  tags: string[]
  /** 来源（哪个 Agent/任务产生的） */
  source: string
  /** 适用场景 */
  applicableTo: string[]
  /** 使用次数 */
  usageCount: number
  /** 成功率 */
  successRate: number
  /** 置信度 */
  confidence: number
  /** 状态 */
  status: 'active' | 'deprecated' | 'draft'
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ─── 知识查询 ──────────────────────────────────────────────────────

export interface KnowledgeQuery {
  /** 查询文本 */
  text?: string
  /** 按类型过滤 */
  type?: KnowledgeType
  /** 按标签过滤 */
  tags?: string[]
  /** 按来源过滤 */
  source?: string
  /** 最小置信度 */
  minConfidence?: number
  /** 最小使用次数 */
  minUsageCount?: number
  /** 结果数量限制 */
  limit?: number
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry
  score: number
  matchType: 'semantic' | 'keyword' | 'tag' | 'type'
}

// ─── 知识统计 ──────────────────────────────────────────────────────

export interface KnowledgeStats {
  totalEntries: number
  byType: Record<KnowledgeType, number>
  byStatus: Record<string, number>
  topUsed: KnowledgeEntry[]
  recentlyAdded: KnowledgeEntry[]
}
