import { asc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarBlocks, calendarSettings } from "@/db/schema";
import { toPublicCalendarBlock } from "@/lib/calendar-domain.mjs";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

    const db = getDb();
    const [settingsRows, blocks] = await Promise.all([
      db.select().from(calendarSettings).where(eq(calendarSettings.ownerId, user.id)).limit(1),
      db.select().from(calendarBlocks).where(eq(calendarBlocks.ownerId, user.id)).orderBy(asc(calendarBlocks.dayOfWeek), asc(calendarBlocks.startMinutes)),
    ]);

    return Response.json({
      timezone: settingsRows[0]?.timezone ?? "UTC",
      hasCustomTimezone: Boolean(settingsRows[0]),
      blocks: blocks.map(toPublicCalendarBlock),
    });
  } catch (error) {
    console.error("Calendar route failed", error);
    return Response.json({ error: "The calendar is temporarily unavailable." }, { status: 500 });
  }
}
