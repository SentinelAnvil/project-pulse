import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { Miniflare } from "miniflare";

const ownerHeaders = {
  "content-type": "application/json",
  "x-auth-test-secret": "integration-test-secret",
  "x-auth-test-user-id": "owner-a",
  "x-auth-test-user-email": "owner-a@example.com",
};
const otherOwnerHeaders = {
  ...ownerHeaders,
  "x-auth-test-user-id": "owner-b",
  "x-auth-test-user-email": "owner-b@example.com",
};

function futureDateForDay(dayOfWeek) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + 14);
  const mondayBasedDay = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1;
  date.setUTCDate(date.getUTCDate() + ((dayOfWeek - mondayBasedDay + 7) % 7));
  return date.toISOString().slice(0, 10);
}

test("authenticated API persists and isolates the complete task workflow", async (context) => {
  const miniflare = new Miniflare({
    modules: true,
    scriptPath: resolve("dist/server/index.js"),
    modulesRoot: resolve("dist/server"),
    modulesRules: [{ type: "ESModule", include: ["**/*.js"] }],
    compatibilityDate: "2026-05-15",
    compatibilityFlags: ["nodejs_compat"],
    bindings: {
      SUPABASE_URL: "http://supabase.test",
      SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      AUTH_TEST_SECRET: "integration-test-secret",
    },
    d1Databases: { DB: "project-pulse-test" },
    assets: {
      directory: resolve("dist/client"),
      binding: "ASSETS",
      routerConfig: { invoke_user_worker_ahead_of_assets: true, has_user_worker: true },
    },
  });
  context.after(() => miniflare.dispose());

  const database = await miniflare.getD1Database("DB");
  const migrationFiles = (await readdir(resolve("drizzle"))).filter((file) => file.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const migration = await readFile(resolve("drizzle", file), "utf8");
    for (const statement of migration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean)) {
      await database.prepare(statement).run();
    }
  }

  const request = (path, init = {}) =>
    miniflare.dispatchFetch(`http://project-pulse.test${path}`, init);

  const publicHome = await request("/");
  assert.equal(publicHome.status, 200);
  assert.match(await publicHome.text(), /Stop letting important work quietly disappear/);

  const login = await request("/login");
  assert.equal(login.status, 200);
  assert.match(await login.text(), /Sign in to your dashboard/);

  const dashboardShell = await request("/dashboard");
  assert.equal(dashboardShell.status, 200);
  assert.match(await dashboardShell.text(), /Checking your session/);

  const calendarShell = await request("/calendar");
  assert.equal(calendarShell.status, 200);
  assert.match(await calendarShell.text(), /Checking your session/);

  const importShell = await request("/calendar/import");
  assert.equal(importShell.status, 200);
  assert.match(await importShell.text(), /Checking your session/);

  const authConfig = await request("/api/auth/config");
  assert.equal(authConfig.status, 200);
  assert.deepEqual(await authConfig.json(), {
    url: "http://supabase.test",
    publishableKey: "test-publishable-key",
  });

  const unauthorized = await request("/api/tasks");
  assert.equal(unauthorized.status, 401);

  const unauthorizedCalendar = await request("/api/calendar");
  assert.equal(unauthorizedCalendar.status, 401);

  const legacyChatGPTHeaders = await request("/api/tasks", {
    headers: {
      "oai-authenticated-user-id": "legacy-owner",
      "oai-authenticated-user-email": "legacy@example.com",
    },
  });
  assert.equal(legacyChatGPTHeaders.status, 401);

  const malformed = await request("/api/tasks", {
    method: "POST",
    headers: ownerHeaders,
    body: "not-json",
  });
  assert.equal(malformed.status, 400);

  const createdResponse = await request("/api/tasks", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ title: "  Ship MVP  ", description: "First slice", dueDate: "2026-09-10" }),
  });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).task;
  assert.equal(created.title, "Ship MVP");
  assert.equal("ownerId" in created, false);

  const ownerList = await request("/api/tasks", { headers: ownerHeaders });
  assert.equal(ownerList.status, 200);
  assert.deepEqual((await ownerList.json()).tasks.map(({ id }) => id), [created.id]);

  const isolatedList = await request("/api/tasks", { headers: otherOwnerHeaders });
  assert.deepEqual((await isolatedList.json()).tasks, []);

  const crossOwnerMutation = await request(`/api/tasks/${created.id}`, {
    method: "PATCH",
    headers: otherOwnerHeaders,
    body: JSON.stringify({ action: "complete" }),
  });
  assert.equal(crossOwnerMutation.status, 404);

  const editedResponse = await request(`/api/tasks/${created.id}`, {
    method: "PUT",
    headers: ownerHeaders,
    body: JSON.stringify({ title: "Ship tested MVP", description: "Verified", dueDate: null }),
  });
  assert.equal(editedResponse.status, 200);
  assert.equal((await editedResponse.json()).task.title, "Ship tested MVP");

  const touchedResponse = await request(`/api/tasks/${created.id}`, {
    method: "PATCH",
    headers: ownerHeaders,
    body: JSON.stringify({ action: "touch" }),
  });
  assert.equal(touchedResponse.status, 200);

  const completedResponse = await request(`/api/tasks/${created.id}`, {
    method: "PATCH",
    headers: ownerHeaders,
    body: JSON.stringify({ action: "complete" }),
  });
  assert.equal(completedResponse.status, 200);
  assert.equal((await completedResponse.json()).task.status, "completed");

  const completedTouch = await request(`/api/tasks/${created.id}`, {
    method: "PATCH",
    headers: ownerHeaders,
    body: JSON.stringify({ action: "touch" }),
  });
  assert.equal(completedTouch.status, 409);

  const reopenedResponse = await request(`/api/tasks/${created.id}`, {
    method: "PATCH",
    headers: ownerHeaders,
    body: JSON.stringify({ action: "reopen" }),
  });
  assert.equal(reopenedResponse.status, 200);
  assert.equal((await reopenedResponse.json()).task.status, "active");

  const deletedResponse = await request(`/api/tasks/${created.id}`, {
    method: "DELETE",
    headers: ownerHeaders,
  });
  assert.equal(deletedResponse.status, 204);

  const finalList = await request("/api/tasks", { headers: ownerHeaders });
  assert.deepEqual((await finalList.json()).tasks, []);

  const timezoneResponse = await request("/api/calendar/settings", {
    method: "PUT",
    headers: ownerHeaders,
    body: JSON.stringify({ timezone: "Europe/Stockholm" }),
  });
  assert.equal(timezoneResponse.status, 200);

  const invalidBlock = await request("/api/calendar/blocks", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ title: "Overnight", category: "fixed", dayOfWeek: 0, startTime: "22:00", endTime: "06:00" }),
  });
  assert.equal(invalidBlock.status, 400);

  const createdBlockResponse = await request("/api/calendar/blocks", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ title: "Deep work", notes: "No meetings", category: "protected", dayOfWeek: 0, startTime: "09:00", endTime: "10:30" }),
  });
  assert.equal(createdBlockResponse.status, 201);
  const createdBlock = (await createdBlockResponse.json()).block;
  assert.equal("ownerId" in createdBlock, false);

  const ownerCalendar = await request("/api/calendar", { headers: ownerHeaders });
  const ownerCalendarData = await ownerCalendar.json();
  assert.equal(ownerCalendarData.timezone, "Europe/Stockholm");
  assert.deepEqual(ownerCalendarData.blocks.map(({ id }) => id), [createdBlock.id]);

  const isolatedCalendar = await request("/api/calendar", { headers: otherOwnerHeaders });
  assert.deepEqual((await isolatedCalendar.json()).blocks, []);

  const crossOwnerCalendarMutation = await request(`/api/calendar/blocks/${createdBlock.id}`, {
    method: "DELETE",
    headers: otherOwnerHeaders,
  });
  assert.equal(crossOwnerCalendarMutation.status, 404);

  const taskBlockResponse = await request("/api/calendar/blocks", {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ title: "Hold the Island", notes: "Protect the launch", category: "focus", dayOfWeek: 2, startTime: "06:30", endTime: "08:30" }),
  });
  assert.equal(taskBlockResponse.status, 201);
  const taskBlock = (await taskBlockResponse.json()).block;
  const futureWednesday = futureDateForDay(2);
  const futureThursday = futureDateForDay(3);

  const wrongWeekday = await request(`/api/calendar/blocks/${taskBlock.id}/tasks`, {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ scheduledDate: futureThursday }),
  });
  assert.equal(wrongWeekday.status, 400);
  assert.match((await wrongWeekday.json()).error, /wednesday/);

  const crossOwnerTaskFromBlock = await request(`/api/calendar/blocks/${taskBlock.id}/tasks`, {
    method: "POST",
    headers: otherOwnerHeaders,
    body: JSON.stringify({ scheduledDate: futureWednesday }),
  });
  assert.equal(crossOwnerTaskFromBlock.status, 404);

  const scheduledTaskResponse = await request(`/api/calendar/blocks/${taskBlock.id}/tasks`, {
    method: "POST",
    headers: ownerHeaders,
    body: JSON.stringify({ scheduledDate: futureWednesday }),
  });
  assert.equal(scheduledTaskResponse.status, 201);
  const scheduledTask = (await scheduledTaskResponse.json()).task;
  assert.equal(scheduledTask.title, "Hold the Island");
  assert.equal(scheduledTask.description, "Protect the launch");
  assert.equal(scheduledTask.dueDate, null);
  assert.deepEqual(scheduledTask.schedule, {
    date: futureWednesday,
    startTime: "06:30",
    endTime: "08:30",
    timezone: "Europe/Stockholm",
    sourceBlockId: taskBlock.id,
  });

  const taskListWithSchedule = await request("/api/tasks", { headers: ownerHeaders });
  assert.deepEqual((await taskListWithSchedule.json()).tasks.map(({ id }) => id), [scheduledTask.id]);
  const otherOwnerTaskList = await request("/api/tasks", { headers: otherOwnerHeaders });
  assert.deepEqual((await otherOwnerTaskList.json()).tasks, []);

  const calendarAfterTask = await request("/api/calendar", { headers: ownerHeaders });
  assert.equal((await calendarAfterTask.json()).blocks.some(({ id }) => id === taskBlock.id), true);

  const deletedTaskBlock = await request(`/api/calendar/blocks/${taskBlock.id}`, { method: "DELETE", headers: ownerHeaders });
  assert.equal(deletedTaskBlock.status, 204);
  const taskAfterBlockDelete = await request("/api/tasks", { headers: ownerHeaders });
  assert.equal((await taskAfterBlockDelete.json()).tasks[0].schedule.sourceBlockId, taskBlock.id);

  const schedule = {
    version: 1,
    timezone: "Europe/Stockholm",
    blocks: [
      { title: "Deep work", notes: "Duplicate notes do not matter", category: "protected", days: ["monday"], start: "09:00", end: "10:30" },
      { title: "Daily walk", category: "routine", days: ["tuesday"], start: "16:00", end: "16:40" },
    ],
  };
  const previewResponse = await request("/api/calendar/import/preview", { method: "POST", headers: ownerHeaders, body: JSON.stringify(schedule) });
  assert.equal(previewResponse.status, 200);
  const preview = await previewResponse.json();
  assert.equal(preview.valid, true);
  assert.equal(preview.duplicateCount, 1);
  assert.equal(preview.blocks.length, 2);

  const importResponse = await request("/api/calendar/import", { method: "POST", headers: ownerHeaders, body: JSON.stringify(schedule) });
  assert.equal(importResponse.status, 201);
  assert.deepEqual(await importResponse.json(), { importedCount: 1, skippedCount: 1, timezone: "Europe/Stockholm" });

  const twelveBlockSchedule = {
    version: 1,
    timezone: "Europe/Stockholm",
    blocks: [
      { title: "Office work", category: "fixed", days: ["monday", "tuesday", "thursday"], start: "07:00", end: "15:30" },
      { title: "Hold the Island", category: "protected", days: ["wednesday", "friday"], start: "09:00", end: "10:30" },
      { title: "Daily walk", category: "routine", days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "16:00", end: "16:40" },
    ],
  };
  const twelveBlockImport = await request("/api/calendar/import", { method: "POST", headers: ownerHeaders, body: JSON.stringify(twelveBlockSchedule) });
  assert.equal(twelveBlockImport.status, 201);
  assert.deepEqual(await twelveBlockImport.json(), { importedCount: 11, skippedCount: 1, timezone: "Europe/Stockholm" });

  const editedBlockResponse = await request(`/api/calendar/blocks/${createdBlock.id}`, {
    method: "PUT",
    headers: ownerHeaders,
    body: JSON.stringify({ title: "Protected focus", notes: "", category: "focus", dayOfWeek: 2, startTime: "09:30", endTime: "11:00" }),
  });
  assert.equal(editedBlockResponse.status, 200);
  assert.equal((await editedBlockResponse.json()).block.source, "manual");

  const deletedBlockResponse = await request(`/api/calendar/blocks/${createdBlock.id}`, { method: "DELETE", headers: ownerHeaders });
  assert.equal(deletedBlockResponse.status, 204);

  const deletedScheduledTask = await request(`/api/tasks/${scheduledTask.id}`, { method: "DELETE", headers: ownerHeaders });
  assert.equal(deletedScheduledTask.status, 204);
  const scheduleRows = await database.prepare("SELECT task_id FROM task_schedules WHERE task_id = ?").bind(scheduledTask.id).all();
  assert.deepEqual(scheduleRows.results, []);
});
