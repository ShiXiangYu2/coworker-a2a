import type { ReactNode } from 'react'

export const lifecycleStatuses = ['draft', 'review', 'approved_record', 'rejected', 'superseded', 'archived']

const statusTone: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-200',
  review: 'bg-sky-50 text-sky-700 ring-sky-200',
  approved_record: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  superseded: 'bg-amber-50 text-amber-700 ring-amber-200',
  archived: 'bg-slate-100 text-slate-600 ring-slate-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  running: 'bg-sky-50 text-sky-700 ring-sky-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  failed: 'bg-rose-50 text-rose-700 ring-rose-200',
  passed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const statusLabels: Record<string, string> = {
  draft: '草稿',
  review: '待评审',
  approved_record: '已批准记录',
  rejected: '已拒绝',
  superseded: '已替代',
  archived: '已归档',
  pending: '等待中',
  running: '运行中',
  completed: '已完成',
  blocked: '已阻塞',
  cancelled: '已取消',
  failed: '失败',
  passed: '通过',
}

// ─── 面板容器 ──────────────────────────────────────────────────────

export function PanelShell({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-950 sm:text-lg">{title}</h2>
          {description && <p className="mt-1 max-w-4xl text-xs leading-5 text-gray-500">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}

// ─── 加载状态 ──────────────────────────────────────────────────────

export function LoadingState({ label = '正在读取本地记录...' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-2 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 text-sm text-gray-500">{label}</div>
    </div>
  )
}

/**
 * Skeleton 加载动画（用于列表项）
 */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="h-3 w-full animate-pulse rounded bg-gray-100" style={{ width: `${90 - i * 10}%` }} />
        ))}
      </div>
    </div>
  )
}

/**
 * 表格 Skeleton
 */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="animate-pulse">
        {/* Header */}
        <div className="flex border-b border-gray-200 bg-gray-50 px-4 py-3">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 flex-1 mx-2 rounded bg-gray-200" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="flex border-b border-gray-100 px-4 py-3">
            {Array.from({ length: cols }).map((_, col) => (
              <div key={col} className="h-3 flex-1 mx-2 rounded bg-gray-100" style={{ width: `${70 + col * 5}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── 空状态 ────────────────────────────────────────────────────────

export function EmptyState({ title, description, icon }: { title: string; description: string; icon?: string }) {
  return (
    <div className="px-4 py-12 text-center">
      {icon && <div className="text-4xl mb-3">{icon}</div>}
      <div className="text-sm font-medium text-gray-800">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">{description}</p>
    </div>
  )
}

// ─── 错误状态 ──────────────────────────────────────────────────────

export function ErrorState({ message, action, onRetry }: { message: string; action?: ReactNode; onRetry?: () => void }) {
  return (
    <div className="m-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-rose-500">❌</span>
          <span className="text-sm text-rose-700">{message}</span>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              重试
            </button>
          )}
          {action}
        </div>
      </div>
    </div>
  )
}

/**
 * 错误边界组件
 */
export function ErrorBoundary({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <div className="min-h-[200px]">
      {children ?? fallback ?? (
        <ErrorState message="组件渲染出错" />
      )}
    </div>
  )
}

// ─── 状态标签 ──────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusTone[status] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
      <span className="truncate">{statusLabels[status] ?? status}</span>
    </span>
  )
}

// ─── 按钮 ──────────────────────────────────────────────────────────

export function RefreshButton({
  onClick,
  disabled,
  children = '刷新',
}: {
  onClick: () => void
  disabled?: boolean
  children?: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/**
 * 主按钮
 */
export function PrimaryButton({
  onClick,
  disabled,
  children,
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

// ─── 提示 ──────────────────────────────────────────────────────────

export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
      {children}
    </div>
  )
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">
      {children}
    </div>
  )
}

// ─── 元数据 ────────────────────────────────────────────────────────

export function RecordMeta({ children }: { children: ReactNode }) {
  return <div className="mt-1 break-words text-xs leading-5 text-gray-500">{children}</div>
}

/**
 * 标签
 */
export function Tag({ children, color = 'gray' }: { children: ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    gray: 'bg-gray-100 text-gray-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    purple: 'bg-purple-100 text-purple-700',
  }

  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  )
}

/**
 * 分隔线
 */
export function Divider() {
  return <hr className="my-4 border-gray-200" />
}

/**
 * 卡片
 */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
