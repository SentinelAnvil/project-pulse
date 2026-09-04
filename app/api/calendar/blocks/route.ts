import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarBlocks } from "@/db/schema";
import { createCalendarBlockRecord, toPublicCalendarBlock, validateCalendarBlockInput } from "@/lib/calendar-domain.mjs";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON calendar block is required." }, { status: 400 });
    }
    const validated = validateCalendarBlockInput(body);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    const now = new Date().toISOString();
    const block = createCalendarBlockRecord(validated.value, now, crypto.randomUUID(), user.id);
    await getDb().insert(calendarBlocks).values(block);
    return Response.json({ block: toPublicCalendarBlock(block) }, { status: 201 });
  } catch (error) {
    console.error("Calendar block route failed", error);
    return Response.json({ error: "The calendar block could not be added." }, { status: 500 });
  }
}
