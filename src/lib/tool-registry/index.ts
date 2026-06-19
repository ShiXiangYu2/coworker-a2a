import { executeObsidianDraftPlan, type ObsidianDraftPlan, type ObsidianDraftReceipt } from '@/lib/tools/obsidian-draft'
import type { ToolDefinition, ToolExecutionContext, ToolExecutionReceipt } from './types'

type RegisteredTool = ToolDefinition<unknown, ToolExecutionReceipt>

export type { ToolDefinition, ToolExecutionContext, ToolExecutionReceipt } from './types'

export const obsidianWriteDraftTool: ToolDefinition<ObsidianDraftPlan, ToolExecutionReceipt> = {
  id: 'obsidian.write_draft',
  action: 'write_local_markdown_draft',
  riskLevel: 'medium',
  execute: async (plan: ObsidianDraftPlan, context: ToolExecutionContext) => {
    const receipt: ObsidianDraftReceipt = await executeObsidianDraftPlan(plan, context)
    return {
      ...receipt,
      toolId: 'obsidian.write_draft',
    }
  },
}

const TOOL_REGISTRY = new Map<string, RegisteredTool>([
  [obsidianWriteDraftTool.id, obsidianWriteDraftTool as RegisteredTool],
])

export function getToolDefinition(id: string): RegisteredTool | undefined {
  return TOOL_REGISTRY.get(id)
}

export async function executeRegisteredTool<TPlan>(args: {
  toolId: string
  plan: TPlan
  context: ToolExecutionContext
}): Promise<ToolExecutionReceipt> {
  const tool = getToolDefinition(args.toolId)
  if (!tool) {
    throw new Error(`Tool is not registered: ${args.toolId}`)
  }
  return tool.execute(args.plan, args.context)
}
