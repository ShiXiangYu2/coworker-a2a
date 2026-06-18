/**
 * LLM Provider 工厂
 *
 * 通过环境变量 LLM_PROVIDER 切换：
 * - mock（默认）：使用 MockLLMProvider（本地开发，无需 API Key）
 * - claude：使用 ClaudeLLMProvider（需要 ANTHROPIC_API_KEY）
 * - deepseek：使用 DeepSeekLLMProvider（需要 DEEPSEEK_API_KEY）
 * - stepfun：使用 StepFunLLMProvider（需要 STEPFUN_API_KEY）
 *
 * 环境变量：
 * - LLM_PROVIDER: "mock" | "claude" | "deepseek" | "stepfun"（默认 "mock"）
 * - ANTHROPIC_API_KEY: Claude API Key（claude 模式必填）
 * - CLAUDE_MODEL: 模型名称（可选，默认 claude-sonnet-4-20250514）
 * - CLAUDE_MAX_TOKENS: 最大输出 token 数（可选，默认 4096）
 * - DEEPSEEK_API_KEY: DeepSeek API Key（deepseek 模式必填）
 * - DEEPSEEK_BASE_URL: API 基础 URL（可选，默认 https://api.deepseek.com/anthropic）
 * - DEEPSEEK_MODEL: 模型名称（可选，默认 deepseek-v4-pro）
 * - DEEPSEEK_MAX_TOKENS: 最大输出 token 数（可选，默认 4096）
 * - STEPFUN_API_KEY: StepFun API Key（stepfun 模式必填）
 * - STEPFUN_BASE_URL: API 基础 URL（可选，默认 https://api.stepfun.com）
 * - STEPFUN_MODEL: 模型名称（可选，默认 step-3.7-flash）
 * - STEPFUN_MAX_TOKENS: 最大输出 token 数（可选，默认 4096）
 * - STEPFUN_RETRY_COUNT: 重试次数（可选，默认 2）
 * - STEPFUN_RETRY_DELAY_MS: 重试基础延迟毫秒数（可选，默认 1000）
 */

import type { LLMProvider } from './types'
import { MockLLMProvider } from './mock'

export type { LLMProvider, ChatMessage, StreamEvent, LLMToolDefinition, LLMChatResult } from './types'

let _provider: LLMProvider | null = null

/**
 * 获取 LLM Provider 实例（单例）
 */
export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider

  const providerType = process.env.LLM_PROVIDER || 'mock'
  const isProduction = process.env.NODE_ENV === 'production'

  // 生产环境检查
  if (isProduction && providerType === 'mock') {
    console.warn(
      '[LLM] ⚠️  WARNING: Using mock provider in production. ' +
        'Set LLM_PROVIDER=claude, LLM_PROVIDER=deepseek or LLM_PROVIDER=stepfun and configure API keys in .env'
    )
  }

  switch (providerType) {
    case 'claude': {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { ClaudeLLMProvider } = require('./claude')
        _provider = new ClaudeLLMProvider()
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error'
        if (isProduction) {
          throw new Error(`Failed to load Claude provider: ${reason}`)
        }
        console.warn(`[LLM] Failed to load Claude provider: ${reason}`)
        console.warn('[LLM] Falling back to mock provider')
        _provider = new MockLLMProvider()
      }
      break
    }
    case 'deepseek': {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { DeepSeekLLMProvider } = require('./deepseek')
        _provider = new DeepSeekLLMProvider()
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error'
        if (isProduction) {
          throw new Error(`Failed to load DeepSeek provider: ${reason}`)
        }
        console.warn(`[LLM] Failed to load DeepSeek provider: ${reason}`)
        console.warn('[LLM] Falling back to mock provider')
        _provider = new MockLLMProvider()
      }
      break
    }
    case 'stepfun': {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { StepFunLLMProvider } = require('./stepfun')
        _provider = new StepFunLLMProvider()
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'Unknown error'
        if (isProduction) {
          throw new Error(`Failed to load StepFun provider: ${reason}`)
        }
        console.warn(`[LLM] Failed to load StepFun provider: ${reason}`)
        console.warn('[LLM] Falling back to mock provider')
        _provider = new MockLLMProvider()
      }
      break
    }
    case 'mock':
    default:
      _provider = new MockLLMProvider()
      break
  }

  console.log(`[LLM] Using provider: ${_provider!.name}`)
  return _provider!
}

/**
 * 重置 Provider（用于测试）
 */
export function resetLLMProvider(): void {
  _provider = null
}
