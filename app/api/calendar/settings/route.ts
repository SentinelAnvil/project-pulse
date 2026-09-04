import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { calendarSettings } from "@/db/schema";
import { isValidTimezone } from "@/lib/calendar-domain.mjs";

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "A valid JSON settings object is required." }, { status: 400 });
    }
    const timezone = body && typeof body === "object" && !Array.isArray(body) && "timezone" in body
      ? (body as { timezone?: unknown }).timezone
      : undefined;
    if (!isValidTimezone(timezone)) {
      return Response.json({ error: "Choose a valid IANA timezone." }, { status: 400 });
    }
    const timezoneValue = timezone as string;

    const now = new Date().toISOString();
    await getDb().insert(calendarSettings).values({ ownerId: user.id, timezone: timezoneValue, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: calendarSettings.ownerId, set: { timezone: timezoneValue, updatedAt: now } });
    return Response.json({ timezone: timezoneValue });
  } catch (error) {
    console.error("Calendar settings route failed", error);
    return Response.json({ error: "Calendar settings could not be saved." }, { status: 500 });
  }
}
