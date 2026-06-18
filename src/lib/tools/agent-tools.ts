/**
 * Sprint 19: Agent 可用的工具定义
 *
 * 定义 Agent 可以调用的工具，供 LLM Tool Use 使用
 */

import type { LLMToolDefinition } from '@/lib/llm/types'

/** 执行命令工具 */
export const executeCommandTool: LLMToolDefinition = {
  name: 'execute_command',
  description: 'Execute a shell command in a sandboxed environment. Only whitelisted commands are allowed (echo, ls, cat, git status, node -e, etc.). Dangerous commands are blocked.',
  input_schema: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute',
      },
    },
    required: ['command'],
  },
}

/** 写入文件工具 */
export const writeFileTool: LLMToolDefinition = {
  name: 'write_file',
  description: 'Write content to a file in the safe deliverables directory. Use this to save analysis reports, code, or documents.',
  input_schema: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'Filename (e.g., "report.md", "analysis.json")',
      },
      content: {
        type: 'string',
        description: 'File content to write',
      },
    },
    required: ['filename', 'content'],
  },
}

/** 读取文件工具 */
export const readFileTool: LLMToolDefinition = {
  name: 'read_file',
  description: 'Read content from a file in the safe deliverables directory.',
  input_schema: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'Filename to read',
      },
    },
    required: ['filename'],
  },
}

/** 所有可用工具 */
export const agentTools: LLMToolDefinition[] = [
  executeCommandTool,
  writeFileTool,
  readFileTool,
]
