import type { ToolCallBundle } from '@/lib/tools/types'
import { sprint11SafetyNote, sprint6SafetyNote } from '@/lib/tools/types'
import { sprint8SafetyNote } from '@/lib/observability/types'
import { sprint10SafetyNote } from '@/lib/production-security/types'

interface ToolCallCardProps {
  bundles: ToolCallBundle[]
  isUpdating?: boolean
  isRunningVerification?: boolean
  onEvaluatePermission?: (toolCallId: string) => void
  onApproveRecord?: (confirmationId: string) => void
  onReject?: (confirmationId: string) => void
  onCancel?: (toolCallId: string) => void
  onRunVerification?: (targetType: string, targetId: string) => void
  onPlanExecution?: (toolCallId: string) => void
  onSubmitExecutionConfirmation?: (planId: string) => void
  onApproveExecution?: (toolRunId: string) => void
  onExecuteApproved?: (toolRunId: string) => void
  onCancelExecution?: (toolRunId: string) => void
}

export function ToolCallCard({
  bundles,
  isUpdating = false,
  isRunningVerification = false,
  onEvaluatePermission,
  onApproveRecord,
  onReject,
  onCancel,
  onRunVerification,
  onPlanExecution,
  onSubmitExecutionConfirmation,
  onApproveExecution,
  onExecuteApproved,
  onCancelExecution,
}: ToolCallCardProps) {
  if (bundles.length === 0) return null

  return (
    <section className="border-b bg-violet-50 px-4 py-3 text-sm text-violet-950">
      <div className="mx-auto flex max-w-4xl flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">Tool Proposals</span>
          <span className="rounded bg-white px-2 py-0.5 text-xs font-medium text-violet-800 ring-1 ring-violet-200">
            {bundles.length} local records
          </span>
        </div>
        <div className="text-xs font-medium text-violet-700">{sprint6SafetyNote}</div>
        <div className="text-xs font-medium text-stone-700">{sprint8SafetyNote}</div>
        <div className="text-xs font-medium text-slate-700">{sprint10SafetyNote}</div>
        <div className="text-xs font-medium text-rose-700">{sprint11SafetyNote}</div>

        <div className="space-y-2">
          {bundles.map(({ toolCall, latestPermission, toolRuns, executionPlans, executionReceipts }) => {
            const latestRun = toolRuns[0]
            const latestPlan = executionPlans?.[0]
            const latestReceipt = executionReceipts?.[0]
            return (
            <div key={toolCall.id} className="rounded-md border border-violet-200 bg-white p-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{toolCall.toolName}</span>
                <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                  {toolCall.status}
                </span>
                <span className="rounded bg-violet-100 px-2 py-0.5 text-xs text-violet-800">
                  {toolCall.riskLevel}
                </span>
              </div>
              <div className="mt-1 text-violet-900">{toolCall.intent}</div>
              <div className="text-xs text-violet-700">{toolCall.inputSummary}</div>
              {latestPermission && (
                <div className="mt-2 rounded border border-violet-100 bg-violet-50 p-2 text-xs">
                  <div className="font-semibold">Policy Decision: {latestPermission.decision}</div>
                  <div>{latestPermission.reason}</div>
                </div>
              )}
              {(latestRun || latestPlan || latestReceipt) && (
                <div className="mt-2 grid gap-2 rounded border border-rose-100 bg-rose-50 p-2 text-xs text-rose-950 sm:grid-cols-3">
                  <div>
                    <div className="font-semibold">ToolRun</div>
                    <div>{latestRun ? `${latestRun.status} / ${latestRun.mode}` : 'none'}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Execution Plan</div>
                    <div>{latestPlan ? latestPlan.status : 'none'}</div>
                  </div>
                  <div>
                    <div className="font-semibold">Execution Receipt</div>
                    <div>{latestReceipt ? latestReceipt.status : 'none'}</div>
                  </div>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => onPlanExecution?.(latestRun?.id ?? toolCall.id)}
                  className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Plan Tool Execution
                </button>
                {latestPlan && (
                  <a
                    href={`/api/tool-runs/${latestPlan.toolRunId}/execution-plan`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-rose-50"
                  >
                    View Execution Plan
                  </a>
                )}
                {latestPlan?.status === 'ready_for_confirmation' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onSubmitExecutionConfirmation?.(latestPlan.id)}
                    className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Request Kelvin Approval
                  </button>
                )}
                {latestRun?.status === 'awaiting_confirmation' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onApproveExecution?.(latestRun.id)}
                    className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Approve This ToolRun
                  </button>
                )}
                {latestRun?.status === 'approved_for_execution' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onExecuteApproved?.(latestRun.id)}
                    className="rounded-md bg-rose-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Execute Approved Local Tool
                  </button>
                )}
                {latestRun && !['succeeded', 'failed', 'cancelled', 'denied', 'rejected'].includes(latestRun.status) && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onCancelExecution?.(latestRun.id)}
                    className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel Tool Execution
                  </button>
                )}
                {latestReceipt && (
                  <a
                    href={`/api/tool-runs/${latestReceipt.toolRunId}/execution-receipt`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-rose-50"
                  >
                    View Execution Receipt
                  </a>
                )}
                {latestRun?.recoveryPointId && (
                  <a
                    href={`/api/recovery-points/${latestRun.recoveryPointId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-rose-50"
                  >
                    View Recovery Point
                  </a>
                )}
                <a
                  href="/api/tool-execution-policy"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  View Execution Policy
                </a>
                <a
                  href="/api/tool-sandboxes"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-rose-900 ring-1 ring-rose-200 hover:bg-rose-50"
                >
                  View Tool Sandbox
                </a>
                {!latestPermission && toolCall.status === 'proposed' && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onEvaluatePermission?.(toolCall.id)}
                    className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    View Policy Decision
                  </button>
                )}
                {toolCall.status === 'pending_confirmation' && toolCall.confirmationArtifactId && (
                  <>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onApproveRecord?.(toolCall.confirmationArtifactId!)}
                      className="rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Approve Record
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => onReject?.(toolCall.confirmationArtifactId!)}
                      className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {['proposed', 'pending_confirmation', 'blocked', 'approved_record'].includes(toolCall.status) && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => onCancel?.(toolCall.id)}
                    className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-medium text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={isRunningVerification}
                  onClick={() => onRunVerification?.('tool_call', toolCall.id)}
                  className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunningVerification ? 'Running Verification...' : 'Run Verification'}
                </button>
                <a
                  href={`/api/audit/tool-calls/${toolCall.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-50"
                >
                  View Audit
                </a>
                <a
                  href={`/api/security/effective-policy`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-violet-900 ring-1 ring-violet-200 hover:bg-violet-50"
                >
                  View Permission Boundary
                </a>
              </div>
            </div>
          )})}
        </div>
      </div>
    </section>
  )
}
