import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { tasks } from "@/db/schema";
import { createTaskRecord, toPublicTask, validateTaskInput } from "@/lib/task-domain.mjs";

function routeError(error: unknown) {
  console.error("Task route failed", error);
  return Response.json(
    { error: "Tasks are temporarily unavailable. Please try again." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const rows = await getDb()
      .select()
      .from(tasks)
      .where(eq(tasks.ownerId, user.id))
      .orderBy(desc(tasks.createdAt));
    return Response.json({ tasks: rows.map(toPublicTask) });
  } catch (error) {
    return routeError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON task is required." }, { status: 400 });
    }
    const validated = validateTaskInput(body);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const now = new Date().toISOString();
    const task = createTaskRecord(validated.value, now, crypto.randomUUID(), user.id);

    await getDb().insert(tasks).values(task);
    return Response.json({ task: toPublicTask(task) }, { status: 201 });
  } catch (error) {
    return routeError(error);
  }
}
