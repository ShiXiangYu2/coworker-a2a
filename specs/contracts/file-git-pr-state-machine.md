# Contract: File / Git / PR State Machine

Status: proposed for Sprint 12

## Purpose

This state machine applies to FileChangeProposal, PatchDraft, GitChangePlan, PullRequestPlan, and ReviewPatchRecord.

It records local proposal and review lifecycle only.

## States

```ts
FileGitPrRecordStatus =
  | 'proposal'
  | 'draft'
  | 'review'
  | 'approved_record'
  | 'rejected'
  | 'superseded'
  | 'archived'
```

## Allowed Transitions

```text
proposal -> draft
proposal -> review
proposal -> rejected
proposal -> superseded

draft -> review
draft -> rejected
draft -> superseded

review -> approved_record
review -> rejected
review -> superseded

approved_record -> archived
approved_record -> superseded

rejected -> archived
superseded -> archived
```

## Forbidden States

Sprint 12 must not introduce these states:

- `applied`
- `written`
- `formatted`
- `committed`
- `pushed`
- `merged`
- `pr_created`
- `deployed`
- `deleted`
- `executed`
- `rolled_back`
- `replayed`
- `retried`
- `resumed_execution`

## Approval Meaning

`approved_record` means the local proposal record is approved for display, audit, planning, and human review.

It does not mean:

- apply patch.
- write file.
- format file.
- run shell.
- run Git.
- commit.
- push.
- merge.
- create PR.
- deploy.
- delete.
- complete Task.

