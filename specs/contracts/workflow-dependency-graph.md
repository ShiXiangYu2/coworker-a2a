# Contract: WorkflowDependencyGraph

Status: proposed for Sprint 14

## Purpose

WorkflowDependencyGraph stores a local dependency graph for WorkflowStepRecord review order. It is metadata only and must not schedule, enqueue, or execute graph nodes.

## Fields

- `id: string`
- `workflowProposalId: string`
- `nodes: WorkflowGraphNode[]`
- `edges: WorkflowGraphEdge[]`
- `graphIntegrityStatus: 'valid' | 'invalid' | 'needs_review'`
- `cycleDetected: boolean`
- `missingReferenceCount: number`
- `containsExecutableNode: false`
- `createdAt: string`
- `updatedAt: string`

## Node

- `id: string`
- `nodeType: 'workflow_step' | 'source_evidence' | 'review_record' | 'readiness_assessment'`
- `recordId?: string`
- `label: string`
- `canExecute: false`

## Edge

- `fromNodeId: string`
- `toNodeId: string`
- `relation: 'depends_on' | 'blocks' | 'references' | 'reviews'`

## Rules

- Graph traversal must never execute nodes.
- Missing references must produce review findings, not fallback execution.
- Cycles must block readiness recommendation, not trigger automatic repair.
