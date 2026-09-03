# ADR 0001: Derive neglect and persist task events

## Status

Accepted — 2026-09-03

## Decision

Store task status and timestamps in Cloudflare D1, but derive whether a task is neglected whenever it is displayed. An active task is neglected when its due date is before the user's current date or seven full 24-hour periods have passed since `lastTouchedAt`.

Every task is also scoped to a stable, verified authentication-provider user ID. The API requires sign-in, and every database query enforces ownership. See ADR 0002 for the current standalone identity provider.

## Why

`isNeglected` changes as time passes even when nobody writes to the database. Persisting it would create stale or contradictory state and require a background scheduler. Derivation keeps the source of truth small and testable.

## Consequences

- The client performs a small deterministic categorization step.
- Touching or editing a task updates `lastTouchedAt`.
- Overdue tasks remain neglected even after being touched.
- The seven-day threshold is fixed for the MVP.
