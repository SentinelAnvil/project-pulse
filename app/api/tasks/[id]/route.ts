import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { tasks } from "@/db/schema";
import { taskChangesForAction, taskChangesForEdit, toPublicTask, validateTaskInput } from "@/lib/task-domain.mjs";

type RouteContext = { params: Promise<{ id: string }> };

function routeError(error: unknown) {
  console.error("Task route failed", error);
  return Response.json(
    { error: "The task could not be updated. Please try again." },
    { status: 500 },
  );
}

async function taskForUser(id: string, ownerId: string) {
  const [task] = await getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId)))
    .limit(1);
  return task;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON task is required." }, { status: 400 });
    }
    const validated = validateTaskInput(body);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const now = new Date().toISOString();
    await getDb()
      .update(tasks)
      .set(taskChangesForEdit(validated.value, now))
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, user.id)));
    const task = await taskForUser(id, user.id);
    return task
      ? Response.json({ task: toPublicTask(task) })
      : Response.json({ error: "Task not found." }, { status: 404 });
  } catch (error) {
    return routeError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const { id } = await context.params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON action is required." }, { status: 400 });
    }
    const action = body && typeof body === "object" && !Array.isArray(body) && "action" in body
      ? (body as { action?: unknown }).action
      : undefined;
    const now = new Date().toISOString();
    const changes = taskChangesForAction(action, now);

    if (!changes) {
      return Response.json({ error: "Unknown task action." }, { status: 400 });
    }

    const existing = await taskForUser(id, user.id);
    if (!existing) return Response.json({ error: "Task not found." }, { status: 404 });
    if (action === "touch" && existing.status !== "active") {
      return Response.json({ error: "Completed tasks cannot be touched." }, { status: 409 });
    }
    if ((action === "complete" && existing.status === "completed") || (action === "reopen" && existing.status === "active")) {
      return Response.json({ task: toPublicTask(existing) });
    }

    await getDb()
      .update(tasks)
      .set(changes)
      .where(and(eq(tasks.id, id), eq(tasks.ownerId, user.id)));
    const task = await taskForUser(id, user.id);
    return Response.json({ task: toPublicTask(task) });
  } catch (error) {
    return routeError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const { id } = await context.params;
    const existing = await taskForUser(id, user.id);
    if (!existing) return Response.json({ error: "Task not found." }, { status: 404 });
    await getDb().delete(tasks).where(and(eq(tasks.id, id), eq(tasks.ownerId, user.id)));
    return new Response(null, { status: 204 });
  } catch (error) {
    return routeError(error);
  }
}
