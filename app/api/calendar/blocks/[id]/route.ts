import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarBlocks } from "@/db/schema";
import { calendarBlockChanges, toPublicCalendarBlock, validateCalendarBlockInput } from "@/lib/calendar-domain.mjs";

type RouteContext = { params: Promise<{ id: string }> };

async function blockForUser(id: string, ownerId: string) {
  const [block] = await getDb().select().from(calendarBlocks)
    .where(and(eq(calendarBlocks.id, id), eq(calendarBlocks.ownerId, ownerId))).limit(1);
  return block;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const { id } = await context.params;
    if (!await blockForUser(id, user.id)) return Response.json({ error: "Calendar block not found." }, { status: 404 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON calendar block is required." }, { status: 400 });
    }
    const validated = validateCalendarBlockInput(body);
    if (validated.error) return Response.json({ error: validated.error }, { status: 400 });

    await getDb().update(calendarBlocks).set(calendarBlockChanges(validated.value, new Date().toISOString()))
      .where(and(eq(calendarBlocks.id, id), eq(calendarBlocks.ownerId, user.id)));
    return Response.json({ block: toPublicCalendarBlock(await blockForUser(id, user.id)) });
  } catch (error) {
    console.error("Calendar block update failed", error);
    return Response.json({ error: "The calendar block could not be updated." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    const { id } = await context.params;
    if (!await blockForUser(id, user.id)) return Response.json({ error: "Calendar block not found." }, { status: 404 });
    await getDb().delete(calendarBlocks).where(and(eq(calendarBlocks.id, id), eq(calendarBlocks.ownerId, user.id)));
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Calendar block delete failed", error);
    return Response.json({ error: "The calendar block could not be deleted." }, { status: 500 });
  }
}
