import assert from "node:assert/strict";
import test from "node:test";
import { categorizeTasks, isTaskNeglected } from "../lib/task-rules.mjs";

const now = new Date("2026-09-03T12:00:00.000Z");

function task(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    title: "Test task",
    description: "",
    dueDate: null,
    status: "active",
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
    lastTouchedAt: "2026-09-01T12:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}

test("becomes neglected at exactly seven full days", () => {
  assert.equal(isTaskNeglected(task({ lastTouchedAt: "2026-08-27T12:00:00.000Z" }), now), true);
  assert.equal(isTaskNeglected(task({ lastTouchedAt: "2026-08-27T12:00:00.001Z" }), now), false);
});

test("an overdue date is neglected but today is not", () => {
  assert.equal(isTaskNeglected(task({ dueDate: "2026-09-02" }), now), true);
  assert.equal(isTaskNeglected(task({ dueDate: "2026-09-03" }), now), false);
});

test("completed tasks are never neglected", () => {
  assert.equal(isTaskNeglected(task({ status: "completed", dueDate: "2026-08-01" }), now), false);
});

test("categorizes tasks without overlap and orders completions newest first", () => {
  const neglected = task({ id: "n", dueDate: "2026-09-01" });
  const active = task({ id: "a" });
  const olderCompletion = task({ id: "c1", status: "completed", completedAt: "2026-09-01T10:00:00Z" });
  const newerCompletion = task({ id: "c2", status: "completed", completedAt: "2026-09-02T10:00:00Z" });
  const groups = categorizeTasks([active, olderCompletion, neglected, newerCompletion], now);
  assert.deepEqual(groups.neglected.map(({ id }) => id), ["n"]);
  assert.deepEqual(groups.active.map(({ id }) => id), ["a"]);
  assert.deepEqual(groups.completed.map(({ id }) => id), ["c2", "c1"]);
});
