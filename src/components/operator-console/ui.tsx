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

export function LoadingState({ label = '正在读取本地记录...' }: { label?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="h-2 w-32 animate-pulse rounded bg-gray-200" />
      <div className="mt-4 text-sm text-gray-500">{label}</div>
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="text-sm font-medium text-gray-800">{title}</div>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-gray-500">{description}</p>
    </div>
  )
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="m-4 flex flex-col gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
      <span>{message}</span>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusTone[status] ?? 'bg-gray-100 text-gray-700 ring-gray-200'}`}>
      <span className="truncate">{statusLabels[status] ?? status}</span>
    </span>
  )
}

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

export function SafetyNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
      {children}
    </div>
  )
}

export function RecordMeta({ children }: { children: ReactNode }) {
  return <div className="mt-1 break-words text-xs leading-5 text-gray-500">{children}</div>
}
