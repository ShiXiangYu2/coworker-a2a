import { NextRequest } from 'next/server'
import { ExecutionEngine } from '@/lib/execution-engine/engine'
import type { ExecutionRequest, ExecutionAction } from '@/lib/execution-engine/types'

const engine = new ExecutionEngine()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, input, context } = body

    // 验证输入
    if (!action || !input) {
      return Response.json(
        { ok: false, error: { message: 'action and input are required' } },
        { status: 400 }
      )
    }

    // 验证 action 是否有效
    const validActions: ExecutionAction[] = [
      'read_file',
      'write_file',
      'delete_file',
      'list_directory',
      'search_files',
      'git_status',
      'git_add',
      'git_commit',
      'execute_code',
      'call_api',
    ]

    if (!validActions.includes(action)) {
      return Response.json(
        { ok: false, error: { message: `Invalid action: ${action}` } },
        { status: 400 }
      )
    }

    // 检查是否需要审批
    const requiresApproval = ['write_file', 'delete_file', 'git_commit', 'git_push'].includes(action)

    if (requiresApproval) {
      return Response.json({
        ok: true,
        data: {
          status: 'awaiting_approval',
          action,
          input,
          message: `Action ${action} requires human approval`,
        },
      })
    }

    // 创建执行请求
    const executionRequest: ExecutionRequest = {
      id: `exec-${Date.now()}`,
      type: action.includes('file') ? 'file_operation' : action.includes('git') ? 'git_operation' : 'tool_call',
      action,
      input,
      context: context || {
        taskId: 'manual-execution',
        correlationId: `manual-${Date.now()}`,
        agentId: 'user',
        userId: 'user',
        permissions: [],
      },
      requiresApproval: false,
    }

    // 执行
    const result = await engine.execute(executionRequest)

    return Response.json({
      ok: result.status === 'completed',
      data: result,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Execution failed'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'list') {
      // 列出可用的操作
      return Response.json({
        ok: true,
        data: {
          actions: [
            { name: 'read_file', description: '读取文件', requiresApproval: false },
            { name: 'write_file', description: '写入文件', requiresApproval: true },
            { name: 'delete_file', description: '删除文件', requiresApproval: true },
            { name: 'list_directory', description: '列出目录', requiresApproval: false },
            { name: 'search_files', description: '搜索文件', requiresApproval: false },
            { name: 'git_status', description: 'Git 状态', requiresApproval: false },
            { name: 'git_add', description: 'Git 添加', requiresApproval: false },
            { name: 'git_commit', description: 'Git 提交', requiresApproval: true },
            { name: 'execute_code', description: '执行代码', requiresApproval: false },
            { name: 'call_api', description: '调用 API', requiresApproval: false },
          ],
        },
      })
    }

    return Response.json({
      ok: true,
      data: {
        message: 'Execution Engine API',
        usage: 'POST /api/execution with { action, input, context }',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
