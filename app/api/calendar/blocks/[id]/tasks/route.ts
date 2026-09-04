import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarBlocks, calendarSettings, taskSchedules, tasks } from "@/db/schema";
import {
  createTaskScheduleRecord,
  dateKeyInTimezone,
  validateTaskOccurrenceDate,
} from "@/lib/calendar-domain.mjs";
import { createTaskRecord, toPublicTask, validateTaskInput } from "@/lib/task-domain.mjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const { id } = await context.params;
    const db = getDb();
    const [blockRows, settingsRows] = await Promise.all([
      db.select().from(calendarBlocks)
        .where(and(eq(calendarBlocks.id, id), eq(calendarBlocks.ownerId, user.id))).limit(1),
      db.select().from(calendarSettings).where(eq(calendarSettings.ownerId, user.id)).limit(1),
    ]);
    const block = blockRows[0];
    if (!block) return Response.json({ error: "Calendar block not found." }, { status: 404 });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON task is required." }, { status: 400 });
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json({ error: "A task object is required." }, { status: 400 });
    }
    const input = body as { title?: unknown; description?: unknown; scheduledDate?: unknown };
    const validatedTask = validateTaskInput({
      title: input.title ?? block.title,
      description: input.description ?? block.notes,
      dueDate: null,
    });
    if (validatedTask.error) return Response.json({ error: validatedTask.error }, { status: 400 });

    const timezone = settingsRows[0]?.timezone ?? "UTC";
    const validatedDate = validateTaskOccurrenceDate(
      input.scheduledDate,
      block.dayOfWeek,
      dateKeyInTimezone(new Date(), timezone),
    );
    if (validatedDate.error) return Response.json({ error: validatedDate.error }, { status: 400 });

    const now = new Date().toISOString();
    const task = createTaskRecord(validatedTask.value, now, crypto.randomUUID(), user.id);
    const schedule = createTaskScheduleRecord({
      taskId: task.id,
      ownerId: user.id,
      sourceBlockId: block.id,
      scheduledDate: validatedDate.value,
      startMinutes: block.startMinutes,
      endMinutes: block.endMinutes,
      timezone,
    }, now, crypto.randomUUID());

    await db.batch([
      db.insert(tasks).values(task),
      db.insert(taskSchedules).values(schedule),
    ]);
    return Response.json({ task: toPublicTask(task, schedule) }, { status: 201 });
  } catch (error) {
    console.error("Task creation from calendar block failed", error);
    return Response.json({ error: "The task could not be created from this block." }, { status: 500 });
  }
}
