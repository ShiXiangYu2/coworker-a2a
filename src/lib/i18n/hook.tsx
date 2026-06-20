/**
 * i18n Hook — 国际化 Hook
 *
 * 用于在组件中获取翻译文本
 */

'use client'

import { useState, useCallback, createContext, useContext, type ReactNode } from 'react'
import zhCN from '../../../messages/zh-CN.json'
import en from '../../../messages/en.json'
import type { Locale } from './config'

// ─── 翻译字典 ──────────────────────────────────────────────────────

const dictionaries: Record<Locale, Record<string, unknown>> = {
  'zh-CN': zhCN,
  'en': en,
}

// ─── 类型定义 ──────────────────────────────────────────────────────

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Record<string, string>) => string
}

const I18nContext = createContext<I18nContextType>({
  locale: 'zh-CN',
  setLocale: () => {},
  t: (key) => key,
})

// ─── Provider ──────────────────────────────────────────────────────

export function I18nProvider({ children, defaultLocale = 'zh-CN' }: { children: ReactNode; defaultLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(defaultLocale)

  const t = useCallback((key: string, params?: Record<string, string>): string => {
    const dict = dictionaries[locale]
    const keys = key.split('.')
    let value: unknown = dict

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[k]
      } else {
        return key
      }
    }

    if (typeof value !== 'string') return key

    // 替换参数
    if (params) {
      return Object.entries(params).reduce(
        (str, [paramKey, paramValue]) => str.replace(`{${paramKey}}`, paramValue),
        value,
      )
    }

    return value
  }, [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useI18n() {
  return useContext(I18nContext)
}

/**
 * 快捷翻译函数
 */
export function useTranslation() {
  const { t, locale, setLocale } = useI18n()

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'zh-CN' ? 'en' : 'zh-CN')
  }, [locale, setLocale])

  return { t, locale, setLocale, toggleLocale }
}
