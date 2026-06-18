# Contract: ApiAuthBoundary

Status: proposed for Sprint 10

## Purpose

ApiAuthBoundary defines the first production-oriented authentication and authorization boundary for `coworker-a2a`.

Sprint 10 defines roles and API boundary rules only. It does not implement complete multi-tenancy.

First-version API auth is limited to role attribution, route guard, and UI visibility. It is not complete tenant isolation, organization membership, SSO, service account execution, or policy bypass.

## Schema

```ts
ApiAuthBoundary {
  id: string
  boundaryVersion: string

  authMode: 'local_single_user' | 'authenticated_user'
  userIdRequired: boolean
  roleRequired: boolean

  roles: ApiRole[]
  defaultRole: 'viewer'

  agentRecordActorRole: 'agent_record'
  mutationRequiresAudit: true
  highRiskMutationRequiresConfirmation: true
  blockedPayloadsRejected: true

  createdAt: string
  updatedAt: string
}
```

```ts
ApiRole {
  id: 'owner' | 'operator' | 'viewer' | 'agent_record'
  description: string
  allowedApiGroups: string[]
  allowedMutationTypes: string[]
  forbiddenMutationTypes: string[]
  mayApproveHighRiskLocalRecord: boolean
}
```

## First Version Roles

### owner

- Intended actor: Kelvin.
- May review and approve high-risk local records.
- May inspect all local records.
- Must not bypass SecurityPolicy in Sprint 10.

### operator

- May create local records, proposals, reviews, and readiness records.
- May not approve high-risk local records.
- May not execute anything.

### viewer

- Read-only.
- May inspect safety, audit, and readiness records.
- May not mutate records.

### agent_record

- Represents records produced by Agent workflows.
- Not a human user role.
- May not approve records.
- May not execute anything.

## Rules

1. Missing auth boundary means deny mutation.
2. Missing role means viewer.
3. Agent record actors cannot approve local records.
4. High-risk mutation requires owner / Kelvin review.
5. Every mutation requires AuditEvent.
6. Every mutation should include correlationId.
7. Auth approval does not imply execution permission.
8. `actorType` and role attribution do not grant execution permissions by themselves.

## Non-goals

- Complete organization management.
- Full tenant isolation.
- OAuth / SSO integration.
- External identity provider integration.
- API key issuance.
- Service account execution.

## Safety Invariants

- ApiAuthBoundary must not grant Tool execution.
- ApiAuthBoundary must not grant shell, Git, file write, PR, deploy, delete, external API, MCP, A2A dispatch, or autonomous loop permissions.
- `owner` can approve local records only within SecurityPolicy and CommandPolicy.
