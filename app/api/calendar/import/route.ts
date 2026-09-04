import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarBlocks, calendarSettings } from "@/db/schema";
import { chunkCalendarBlockRecords, createCalendarBlockRecord, validateScheduleImport } from "@/lib/calendar-domain.mjs";

function exactKey(block: { dayOfWeek: number; startMinutes: number; endMinutes: number; title: string; category: string }) {
  return [block.dayOfWeek, block.startMinutes, block.endMinutes, block.title, block.category].join("|");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "The import must contain valid JSON." }, { status: 400 });
    }
    const result = validateScheduleImport(body);
    if (!result.valid || !result.timezone) {
      return Response.json({ error: "Fix the schedule validation errors before importing.", errors: result.errors }, { status: 400 });
    }

    const db = getDb();
    const existing = await db.select().from(calendarBlocks).where(eq(calendarBlocks.ownerId, user.id));
    const keys = new Set(existing.map(exactKey));
    const uniqueBlocks = result.blocks.filter((block) => {
      const key = exactKey(block);
      if (keys.has(key)) return false;
      keys.add(key);
      return true;
    });
    const now = new Date().toISOString();
    if (uniqueBlocks.length) {
      const records = uniqueBlocks.map((block) => {
        const input = {
          title: block.title,
          notes: block.notes,
          category: block.category,
          dayOfWeek: block.dayOfWeek,
          startMinutes: block.startMinutes,
          endMinutes: block.endMinutes,
        };
        return createCalendarBlockRecord(input, now, crypto.randomUUID(), user.id, "import");
      });
      for (const chunk of chunkCalendarBlockRecords(records)) {
        await db.insert(calendarBlocks).values(chunk).onConflictDoNothing();
      }
    }
    await db.insert(calendarSettings).values({ ownerId: user.id, timezone: result.timezone, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: calendarSettings.ownerId, set: { timezone: result.timezone, updatedAt: now } });

    return Response.json({ importedCount: uniqueBlocks.length, skippedCount: result.blocks.length - uniqueBlocks.length, timezone: result.timezone }, { status: 201 });
  } catch (error) {
    console.error("Calendar import failed", error);
    return Response.json({ error: "The schedule could not be imported." }, { status: 500 });
  }
}
