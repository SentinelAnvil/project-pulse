import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
  const migration = await readFile(resolve("drizzle/0000_blue_colleen_wing.sql"), "utf8");
  for (const statement of migration.split("--> statement-breakpoint").map((sql) => sql.trim()).filter(Boolean)) {
    await database.prepare(statement).run();
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

  const authConfig = await request("/api/auth/config");
  assert.equal(authConfig.status, 200);
  assert.deepEqual(await authConfig.json(), {
    url: "http://supabase.test",
    publishableKey: "test-publishable-key",
  });

  const unauthorized = await request("/api/tasks");
  assert.equal(unauthorized.status, 401);

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
});
