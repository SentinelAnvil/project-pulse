import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskRecord,
  taskChangesForAction,
  taskChangesForEdit,
  toPublicTask,
  validateTaskInput,
} from "../lib/task-domain.mjs";

const now = "2026-09-03T12:00:00.000Z";

test("validates and normalizes task input", () => {
  assert.deepEqual(validateTaskInput({ title: "  Ship MVP  ", description: "  Verify it  ", dueDate: "" }), {
    value: { title: "Ship MVP", description: "Verify it", dueDate: null },
  });
  assert.equal(validateTaskInput({ title: "   " }).error, "Title must contain 1–120 characters.");
  assert.equal(validateTaskInput({ title: "x", description: "x".repeat(2001) }).error, "Description must be at most 2,000 characters.");
  assert.equal(validateTaskInput(null).error, "A task object is required.");
  assert.equal(validateTaskInput({ title: 42 }).error, "Title must contain 1–120 characters.");
  assert.equal(validateTaskInput({ title: "x", dueDate: "2026-02-30" }).error, "Due date must be a real date in YYYY-MM-DD format.");
});

test("creates an active task with aligned timestamps", () => {
  assert.deepEqual(
    createTaskRecord({ title: "Ship", description: "", dueDate: null }, now, "task-1", "owner-1"),
    {
      id: "task-1",
      ownerId: "owner-1",
      title: "Ship",
      description: "",
      dueDate: null,
      status: "active",
      createdAt: now,
      updatedAt: now,
      lastTouchedAt: now,
      completedAt: null,
    },
  );
});

test("removes the private owner key from API output", () => {
  assert.deepEqual(toPublicTask({ id: "task-1", ownerId: "owner-1", title: "Ship" }), {
    id: "task-1",
    title: "Ship",
  });
});

test("editing content records renewed attention", () => {
  assert.deepEqual(taskChangesForEdit({ title: "Updated", description: "Next", dueDate: null }, now), {
    title: "Updated",
    description: "Next",
    dueDate: null,
    updatedAt: now,
    lastTouchedAt: now,
  });
});

test("touch, complete, and reopen transitions preserve their intended fields", () => {
  assert.deepEqual(taskChangesForAction("touch", now), { lastTouchedAt: now, updatedAt: now });
  assert.deepEqual(taskChangesForAction("complete", now), { status: "completed", completedAt: now, updatedAt: now });
  assert.deepEqual(taskChangesForAction("reopen", now), {
    status: "active",
    completedAt: null,
    lastTouchedAt: now,
    updatedAt: now,
  });
  assert.equal(taskChangesForAction("unknown", now), null);
});
