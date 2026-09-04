# ADR 0003: Model the first calendar as an owner-scoped weekly template

## Status

Accepted — 2026-09-04

## Decision

Store the first Project Pulse calendar as recurring weekly blocks. Each block has one weekday, local start and end minutes, a title, optional notes, and one category: `fixed`, `protected`, `focus`, `flexible`, or `routine`. Store one IANA timezone per owner rather than copying a timezone onto every block.

Manual edits operate on the recurring block, so changing a block changes the weekly template. JSON imports use the versioned Project Pulse schedule contract, expand multi-day definitions into weekday records, and require a server-generated validation preview before confirmation. Import is additive: existing blocks are never removed, and exact duplicates are skipped.

Overlaps produce warnings rather than validation errors. A routine may legitimately sit inside another block, such as lunch inside fixed work hours, and the calendar must represent that truth without forcing the user to flatten it.

## Why

The immediate product need is a reliable picture of a normal week, not a full external calendar system. Weekday plus local minutes makes recurrence easy to edit and reason about, while the owner timezone gives future scheduling logic a stable interpretation across daylight-saving changes.

Server validation is repeated at import time because client preview is a user experience feature, not a security or integrity boundary. Owner filtering remains mandatory in every calendar query, matching the task API.

## Future scheduling boundary

Task scheduling is intentionally not implemented in this slice. A later migration can add task estimated duration and deadline fields plus a separate dated reservation table. Suggestions will derive free intervals from weekly blocks and dated reservations. Accepting one will insert a task reservation only after checking current data again; it will never update, move, or delete a protected block.

This separation matters because a recurring availability template and a specific scheduled task have different lifecycles. Keeping them separate avoids turning calendar blocks into task records or making recurrence exceptions ambiguous.

## Consequences

- Overnight blocks are rejected in version 1 and must be split across two weekdays.
- Imported schedules can contain at most 200 definitions and 400 expanded weekly blocks. Inserts are split into nine-row statements so each stays below D1's 100-bound-parameter limit and the full import stays below the free-plan query limit.
- External Google and Outlook synchronization remains out of scope.
- A future dated-event/exception layer can be added without rewriting weekly recurrence records.
