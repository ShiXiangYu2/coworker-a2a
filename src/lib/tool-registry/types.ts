export type ToolRiskLevel = 'low' | 'medium' | 'high'

export interface ToolExecutionContext {
  approved: boolean
  approvalRecordId?: string
  approvedBy?: 'kelvin'
  now?: Date
}

export interface ToolExecutionReceipt {
  id: string
  toolId: string
  action: string
  status: string
  path: string
  timestamp: string
  executionPlanId: string
  approvalRecordId?: string
  approvedBy?: 'kelvin'
  reason: string
}

export interface ToolDefinition<TPlan, TReceipt extends ToolExecutionReceipt> {
  id: string
  action: string
  riskLevel: ToolRiskLevel
  execute: (plan: TPlan, context: ToolExecutionContext) => Promise<TReceipt>
}
