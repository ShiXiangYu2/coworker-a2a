'use client'

/**
 * Responsive Layout — 响应式布局组件
 *
 * 支持：
 *   - 移动端适配
 *   - 侧边栏折叠
 *   - 标签页导航
 *   - 自适应网格
 */

import { useState, type ReactNode } from 'react'

interface NavItem {
  id: string
  label: string
  icon: string
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: '总览', icon: '📊' },
  { id: 'tasks', label: '任务流', icon: '📋' },
  { id: 'execution', label: '执行态', icon: '⚡' },
  { id: 'governance', label: '治理', icon: '🛡️' },
  { id: 'knowledge', label: '知识', icon: '📚' },
]

/**
 * HARNESS 响应式布局
 */
export function HarnessLayout({
  navItems = DEFAULT_NAV_ITEMS,
  children,
  activeTab,
  onTabChange,
}: {
  navItems?: NavItem[]
  children: ReactNode
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端顶部导航 */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-gray-900">HARNESS</span>
          <div className="w-6" />
        </div>

        {/* 移动端标签页 */}
        <div className="flex overflow-x-auto border-b border-gray-200 bg-white">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onTabChange(item.id)
                setSidebarOpen(false)
              }}
              className={`flex shrink-0 items-center gap-1 px-4 py-3 text-sm font-medium transition ${
                activeTab === item.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{item.icon}</span>
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 桌面端侧边栏 */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-1 flex-col border-r border-gray-200 bg-white">
          <div className="flex h-16 items-center px-4">
            <span className="text-xl font-bold text-gray-900">🛡️ HARNESS</span>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 移动端侧边栏遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      {sidebarOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <span className="text-xl font-bold text-gray-900">🛡️ HARNESS</span>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-gray-600 hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
          <nav className="space-y-1 px-2 py-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  setSidebarOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  activeTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* 主内容区 */}
      <div className="lg:pl-64">
        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * 自适应网格
 */
export function ResponsiveGrid({
  children,
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 4,
}: {
  children: ReactNode
  cols?: { sm?: number; md?: number; lg?: number; xl?: number }
  gap?: number
}) {
  const gridCols = `grid-cols-${cols.sm ?? 1} md:grid-cols-${cols.md ?? 2} lg:grid-cols-${cols.lg ?? 3} xl:grid-cols-${cols.xl ?? 4}`

  return (
    <div className={`grid ${gridCols} gap-${gap}`}>
      {children}
    </div>
  )
}

/**
 * 卡片网格
 */
export function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {children}
    </div>
  )
}

/**
 * 响应式容器
 */
export function ResponsiveContainer({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      {children}
    </div>
  )
}

/**
 * 页面标题
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
