export function validateTaskInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "A task object is required." };
  }
  if (typeof input.title !== "string") {
    return { error: "Title must contain 1–120 characters." };
  }
  if (input.description != null && typeof input.description !== "string") {
    return { error: "Description must be text." };
  }
  if (input.dueDate != null && typeof input.dueDate !== "string") {
    return { error: "Due date must use YYYY-MM-DD format." };
  }

  const title = input.title.trim();
  const description = input.description?.trim() ?? "";

  if (!title || title.length > 120) {
    return { error: "Title must contain 1–120 characters." };
  }
  if (description.length > 2000) {
    return { error: "Description must be at most 2,000 characters." };
  }
  const dueDate = input.dueDate || null;
  if (dueDate && !isValidDateKey(dueDate)) {
    return { error: "Due date must be a real date in YYYY-MM-DD format." };
  }

  return {
    value: {
      title,
      description,
      dueDate,
    },
  };
}

function isValidDateKey(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function createTaskRecord(input, now, id, ownerId) {
  return {
    id,
    ownerId,
    ...input,
    status: "active",
    createdAt: now,
    updatedAt: now,
    lastTouchedAt: now,
    completedAt: null,
  };
}

export function taskChangesForEdit(input, now) {
  return { ...input, updatedAt: now, lastTouchedAt: now };
}

export function taskChangesForAction(action, now) {
  if (action === "complete") {
    return { status: "completed", completedAt: now, updatedAt: now };
  }
  if (action === "reopen") {
    return { status: "active", completedAt: null, lastTouchedAt: now, updatedAt: now };
  }
  if (action === "touch") {
    return { lastTouchedAt: now, updatedAt: now };
  }
  return null;
}

export function toPublicTask(task) {
  const publicTask = { ...task };
  delete publicTask.ownerId;
  return publicTask;
}
