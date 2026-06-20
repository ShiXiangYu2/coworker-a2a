'use client'

/**
 * Theme Toggle — 主题切换按钮
 *
 * 支持亮色/暗色/跟随系统三种模式
 */

import { useTheme } from './theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const cycle = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }

  const icons: Record<string, string> = {
    light: '☀️',
    dark: '🌙',
    system: '💻',
  }

  const labels: Record<string, string> = {
    light: '亮色模式',
    dark: '暗色模式',
    system: '跟随系统',
  }

  return (
    <button
      onClick={cycle}
      className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      title={labels[theme]}
    >
      <span className="text-lg">{icons[theme]}</span>
      <span className="hidden sm:inline">{labels[theme]}</span>
    </button>
  )
}
