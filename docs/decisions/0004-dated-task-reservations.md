# ADR 0004: Create one dated task reservation from a recurring block

## Status

Accepted — 2026-09-04

## Decision

Creating a task from a weekly calendar block creates exactly one normal active task plus one owner-scoped dated reservation. The reservation snapshots the chosen local date, the block's start and end minutes, the owner's IANA timezone, and the source block ID. The source recurring block is not edited, deleted, or converted into a task.

The creation form defaults to the next occurrence that has not ended in the owner's timezone. A user may choose another current or future occurrence on the same weekday. The task title and notes are prefilled from the block but remain editable before creation.

Deleting or editing the recurring source block does not rewrite an existing task reservation. Deleting a task deletes its reservation in the same database batch.

## Why

A weekly block describes repeating intent; a scheduled task describes one concrete commitment. Their lifecycles differ. Keeping a dated reservation separate gives future scheduling agents a reliable list of occupied task intervals while preserving the weekly template and its protected events.

## Consequences

- Creating a task from a block never creates tasks for later recurrences.
- A task reservation can outlive its source block and retains its exact date, time, and timezone.
- Task deadlines remain separate from scheduled reservations; this flow does not infer a deadline from the chosen work time.
- Rescheduling an existing task reservation and automatic open-block suggestions remain future work.
