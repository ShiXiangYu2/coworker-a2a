/**
 * Error Classifier — 错误分类器
 *
 * 将错误分类为不同类别和严重度，决定是否可重试。
 */

import type { ClassifiedError, ErrorSeverity } from './types'

// ─── 错误模式 ──────────────────────────────────────────────────────

const ERROR_PATTERNS: Array<{
  pattern: RegExp
  category: string
  severity: ErrorSeverity
  retryable: boolean
}> = [
  // 超时
  { pattern: /timeout|timed out|deadline exceeded/i, category: 'timeout', severity: 'medium', retryable: true },
  { pattern: /ETIMEDOUT|ESOCKETTIMEDOUT/i, category: 'timeout', severity: 'medium', retryable: true },

  // 限速
  { pattern: /429|rate.?limit|too many requests/i, category: 'rate_limit', severity: 'medium', retryable: true },

  // 服务端错误
  { pattern: /500|502|503|504|server error/i, category: 'server_error', severity: 'high', retryable: true },

  // 网络错误
  { pattern: /ECONNREFUSED|ECONNRESET|ENOTFOUND|network/i, category: 'network', severity: 'medium', retryable: true },

  // 认证错误
  { pattern: /401|403|unauthorized|forbidden|authentication/i, category: 'auth', severity: 'high', retryable: false },

  // 格式错误
  { pattern: /parse|syntax|invalid|malformed|unexpected token/i, category: 'format', severity: 'low', retryable: false },

  // 资源耗尽
  { pattern: /OOM|out of memory|heap|ENOSPC|disk full/i, category: 'resource', severity: 'critical', retryable: false },

  // 数据库错误
  { pattern: /database|sqlite|prisma|constraint|foreign key/i, category: 'database', severity: 'high', retryable: false },

  // 逻辑错误
  { pattern: /assertion|expected|actual|mismatch/i, category: 'logic', severity: 'low', retryable: false },
]

// ─── 分类函数 ──────────────────────────────────────────────────────

/**
 * 对错误进行分类
 */
export function classifyError(error: Error): ClassifiedError {
  const message = error.message || String(error)

  for (const { pattern, category, severity, retryable } of ERROR_PATTERNS) {
    if (pattern.test(message)) {
      return {
        originalError: error,
        severity,
        category,
        retryable,
        message: message.slice(0, 500),
      }
    }
  }

  // 未匹配的错误
  return {
    originalError: error,
    severity: 'medium',
    category: 'unknown',
    retryable: true, // 未知错误默认可重试
    message: message.slice(0, 500),
  }
}

/**
 * 检查错误是否可重试
 */
export function isRetryable(error: Error): boolean {
  return classifyError(error).retryable
}

/**
 * 获取错误严重度
 */
export function getErrorSeverity(error: Error): ErrorSeverity {
  return classifyError(error).severity
}
