/**
 * i18n Configuration — 国际化配置
 *
 * 支持中英文切换
 */

export type Locale = 'zh-CN' | 'en'

export const defaultLocale: Locale = 'zh-CN'
export const locales: Locale[] = ['zh-CN', 'en']

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

export function getLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale

  // 解析 Accept-Language 头
  const preferred = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q] = lang.trim().split(';q=')
      return { code: code.trim(), q: q ? parseFloat(q) : 1 }
    })
    .sort((a, b) => b.q - a.q)

  for (const { code } of preferred) {
    if (code === 'zh' || code.startsWith('zh-')) return 'zh-CN'
    if (code === 'en' || code.startsWith('en-')) return 'en'
  }

  return defaultLocale
}
