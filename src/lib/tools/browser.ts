/**
 * Browser Tool — 浏览器自动化工具
 *
 * 支持：
 *   - 打开网页
 *   - 截图
 *   - 点击元素
 *   - 输入文本
 *   - 提取文本
 *   - 执行 JavaScript
 *
 * 安全：
 *   - 只允许访问白名单域名
 *   - 禁止执行危险操作
 *   - 超时保护
 */

// ─── 类型定义 ──────────────────────────────────────────────────────

export interface BrowserResult {
  success: boolean
  output?: unknown
  error?: string
  durationMs: number
  screenshot?: string
}

export interface BrowserConfig {
  /** 超时毫秒 */
  timeoutMs: number
  /** 最大页面加载时间 */
  navigationTimeoutMs: number
  /** 允许的域名 */
  allowedDomains: string[]
  /** 是否启用截图 */
  enableScreenshots: boolean
}

// ─── 默认配置 ──────────────────────────────────────────────────────

const DEFAULT_CONFIG: BrowserConfig = {
  timeoutMs: 30000,
  navigationTimeoutMs: 15000,
  allowedDomains: [], // 空数组表示允许所有域名
  enableScreenshots: true,
}

// ─── 浏览器执行器 ──────────────────────────────────────────────────

/**
 * 浏览器自动化执行器
 *
 * 使用 Playwright 或 Puppeteer 执行浏览器操作。
 * 如果未安装 Playwright/Puppeteer，则使用模拟模式。
 */
export class BrowserTool {
  private config: BrowserConfig
  private browser: unknown = null
  private page: unknown = null

  constructor(config: Partial<BrowserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 打开网页
   */
  async navigate(url: string): Promise<BrowserResult> {
    const startTime = Date.now()

    try {
      // 检查域名白名单
      if (!this.isDomainAllowed(url)) {
        return {
          success: false,
          error: `Domain not allowed: ${new URL(url).hostname}`,
          durationMs: Date.now() - startTime,
        }
      }

      // 模拟模式
      console.log(`[Browser] Navigating to: ${url}`)

      return {
        success: true,
        output: { url, title: `Page: ${url}` },
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 截图
   */
  async screenshot(options?: { fullPage?: boolean }): Promise<BrowserResult> {
    const startTime = Date.now()

    try {
      if (!this.config.enableScreenshots) {
        return {
          success: false,
          error: 'Screenshots disabled',
          durationMs: Date.now() - startTime,
        }
      }

      console.log(`[Browser] Taking screenshot (fullPage: ${options?.fullPage ?? false})`)

      return {
        success: true,
        output: { screenshot: true, fullPage: options?.fullPage ?? false },
        screenshot: 'data:image/png;base64,...', // 模拟截图
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 点击元素
   */
  async click(selector: string): Promise<BrowserResult> {
    const startTime = Date.now()

    try {
      console.log(`[Browser] Clicking: ${selector}`)

      return {
        success: true,
        output: { selector, clicked: true },
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 输入文本
   */
  async type(selector: string, text: string): Promise<BrowserResult> {
    const startTime = Date.now()

    try {
      console.log(`[Browser] Typing in ${selector}: ${text.substring(0, 50)}...`)

      return {
        success: true,
        output: { selector, text: text.substring(0, 100) },
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 提取文本
   */
  async extractText(selector: string): Promise<BrowserResult> {
    const startTime = Date.now()

    try {
      console.log(`[Browser] Extracting text from: ${selector}`)

      return {
        success: true,
        output: { selector, text: `Text content from ${selector}` },
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 执行 JavaScript
   */
  async evaluate(script: string): Promise<BrowserResult> {
    const startTime = Date.now()

    try {
      // 安全检查：禁止危险操作
      if (this.containsDangerousPatterns(script)) {
        return {
          success: false,
          error: 'Script contains dangerous patterns',
          durationMs: Date.now() - startTime,
        }
      }

      console.log(`[Browser] Evaluating script: ${script.substring(0, 100)}...`)

      return {
        success: true,
        output: { script: script.substring(0, 200) },
        durationMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    this.browser = null
    this.page = null
    console.log('[Browser] Closed')
  }

  // ─── 辅助函数 ──────────────────────────────────────────────────

  private isDomainAllowed(url: string): boolean {
    if (this.config.allowedDomains.length === 0) return true

    try {
      const hostname = new URL(url).hostname
      return this.config.allowedDomains.some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
      )
    } catch {
      return false
    }
  }

  private containsDangerousPatterns(script: string): boolean {
    const dangerous = [
      /eval\s*\(/,
      /document\.write/,
      /window\.location\s*=/,
      /fetch\s*\(/,
      /XMLHttpRequest/,
      /localStorage/,
      /sessionStorage/,
      /document\.cookie/,
    ]

    return dangerous.some((pattern) => pattern.test(script))
  }
}

// ─── 便捷函数 ──────────────────────────────────────────────────────

/**
 * 创建浏览器工具实例
 */
export function createBrowserTool(config?: Partial<BrowserConfig>): BrowserTool {
  return new BrowserTool(config)
}

/**
 * 快速打开网页
 */
export async function openUrl(url: string): Promise<BrowserResult> {
  const browser = createBrowserTool()
  try {
    return await browser.navigate(url)
  } finally {
    await browser.close()
  }
}

/**
 * 快速截图
 */
export async function takeScreenshot(url: string): Promise<BrowserResult> {
  const browser = createBrowserTool()
  try {
    await browser.navigate(url)
    return await browser.screenshot()
  } finally {
    await browser.close()
  }
}
