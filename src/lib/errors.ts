/**
 * 错误处理工具
 */

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class LLMError extends AppError {
  constructor(message: string, statusCode: number = 500) {
    super(message, statusCode, 'LLM_ERROR')
    this.name = 'LLMError'
  }
}

export function handleAPIError(error: unknown): { message: string; statusCode: number } {
  if (error instanceof AppError) {
    return { message: error.message, statusCode: error.statusCode }
  }

  if (error instanceof Error) {
    // Claude API 错误
    if (error.message.includes('ANTHROPIC_API_KEY')) {
      return { message: 'API Key 未配置或无效', statusCode: 401 }
    }
    if (error.message.includes('rate_limit')) {
      return { message: 'API 请求过于频繁，请稍后重试', statusCode: 429 }
    }
    if (error.message.includes('timeout')) {
      return { message: '请求超时，请重试', statusCode: 504 }
    }
  }

  return { message: '服务器内部错误', statusCode: 500 }
}
