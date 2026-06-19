import { NextRequest } from 'next/server'
import { LoopEngine } from '@/lib/loop-engine/engine'
import { AutomationPipelineManager, PREDEFINED_PIPELINES } from '@/lib/loop-engine/automation'
import type { LoopPhase } from '@/lib/loop-engine/types'

const loopEngine = new LoopEngine()
const pipelineManager = new AutomationPipelineManager()

// 创建预定义流水线
Object.entries(PREDEFINED_PIPELINES).forEach(([key, config]) => {
  pipelineManager.createPipeline(config.name, config.steps)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, input, config } = body

    switch (action) {
      case 'start_loop': {
        const phases: LoopPhase[] = config?.phases ?? [
          'requirement_analysis',
          'code_generation',
          'testing',
        ]
        const result = await loopEngine.startLoop(input ?? {}, phases)
        return Response.json({ ok: true, data: result })
      }

      case 'execute_pipeline': {
        const pipelineName = config?.pipelineName ?? 'Full Development Pipeline'
        const pipelines = pipelineManager.getAllPipelines()
        const pipeline = pipelines.find(p => p.name === pipelineName)
        if (!pipeline) {
          return Response.json(
            { ok: false, error: { message: `Pipeline not found: ${pipelineName}` } },
            { status: 404 }
          )
        }
        const result = await pipelineManager.executePipeline(pipeline.id, input ?? {})
        return Response.json({ ok: true, data: result })
      }

      case 'list_pipelines': {
        const pipelines = pipelineManager.getAllPipelines()
        return Response.json({
          ok: true,
          data: pipelines.map(p => ({
            id: p.id,
            name: p.name,
            steps: p.steps.length,
            status: p.status,
          })),
        })
      }

      case 'list_results': {
        const results = loopEngine.getAllResults()
        return Response.json({
          ok: true,
          data: results.map(r => ({
            id: r.id,
            iterations: r.iterations.length,
            status: r.status,
            metrics: r.metrics,
          })),
        })
      }

      default:
        return Response.json(
          { ok: false, error: { message: `Unknown action: ${action}` } },
          { status: 400 }
        )
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Loop engine failed'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'status') {
      return Response.json({
        ok: true,
        data: {
          engine: 'LoopEngine',
          version: '1.0.0',
          capabilities: [
            '循环执行',
            '自动化流程',
            '反馈收集',
            '优化建议',
          ],
          predefinedPipelines: Object.keys(PREDEFINED_PIPELINES),
        },
      })
    }

    return Response.json({
      ok: true,
      data: {
        message: 'Loop Engine API',
        usage: 'POST /api/loop with { action, input, config }',
        actions: ['start_loop', 'execute_pipeline', 'list_pipelines', 'list_results'],
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed'
    return Response.json({ ok: false, error: { message } }, { status: 500 })
  }
}
