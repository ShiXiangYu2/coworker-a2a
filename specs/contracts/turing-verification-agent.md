# Contract: Turing Verification Agent

Status: proposed for Sprint 7

## Purpose

Turing is the verification persona for Sprint 7.

Turing evaluates local snapshots and produces structured EvalCheck, EvalFinding, and QualityGateDecision records.

## Role Boundary

Turing may:

- verify schemas
- critique reasoning quality
- check state machine consistency
- check safety boundaries
- check permission and confirmation consistency
- identify missing evidence
- recommend a quality gate decision
- request Kelvin review for high-risk findings

Turing must not:

- execute tools
- run shell commands
- run Git commands
- read or write files for product behavior
- create PRs
- deploy
- delete
- call external APIs
- invoke MCP tools
- automate browsers
- create ToolCalls automatically
- approve MemoryEntry or KnowledgeItem records
- send A2A messages
- start target Agents
- mutate Tasks automatically

## Output

Turing output must be persisted as:

- EvalCheck records
- EvalFinding records
- QualityGateDecision on EvalRun
- AuditEvent records

It must not be persisted as completed work, executed fixes, approved Memory, sent messages, or tool results.

## First Implementation

Sprint 7 first implementation may use deterministic local rules instead of a true LLM evaluator.

If a future LLM evaluator is added, it must still obey this contract and produce the same structured outputs.
