import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarBlocks } from "@/db/schema";
import { blocksOverlap, CALENDAR_DAYS, publicImportedBlock, validateScheduleImport } from "@/lib/calendar-domain.mjs";

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
    const existing = await getDb().select().from(calendarBlocks).where(eq(calendarBlocks.ownerId, user.id));
    const seenKeys = new Set(existing.map(exactKey));
    let duplicateCount = 0;
    for (const block of result.blocks) {
      const key = exactKey(block);
      if (seenKeys.has(key)) duplicateCount += 1;
      else seenKeys.add(key);
    }
    const warnings = [...result.warnings];
    for (const block of result.blocks) {
      const isExistingDuplicate = existing.some((current) => exactKey(current) === exactKey(block));
      const conflict = isExistingDuplicate ? undefined : existing.find((current) => blocksOverlap(block, current));
      if (conflict) warnings.push(`${CALENDAR_DAYS[block.dayOfWeek]}: “${block.title}” overlaps the existing block “${conflict.title}”.`);
    }
    if (duplicateCount) warnings.push(`${duplicateCount} exact duplicate${duplicateCount === 1 ? "" : "s"} will be skipped.`);

    return Response.json({
      valid: result.valid,
      version: result.version,
      timezone: result.timezone,
      blocks: result.blocks.map(publicImportedBlock),
      errors: result.errors,
      warnings: [...new Set(warnings)],
      duplicateCount,
    });
  } catch (error) {
    console.error("Calendar import preview failed", error);
    return Response.json({ error: "The schedule could not be validated." }, { status: 500 });
  }
}
