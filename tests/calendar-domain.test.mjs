import assert from "node:assert/strict";
import test from "node:test";
import {
  blocksOverlap,
  chunkCalendarBlockRecords,
  createCalendarBlockRecord,
  formatTime,
  isValidTimezone,
  parseTime,
  toPublicCalendarBlock,
  validateCalendarBlockInput,
  validateScheduleImport,
  createTaskScheduleRecord,
  dateKeyInTimezone,
  dayOfWeekForDateKey,
  nextOccurrenceDate,
  validateTaskOccurrenceDate,
} from "../lib/calendar-domain.mjs";

test("parses strict 24-hour times and formats stored minutes", () => {
  assert.equal(parseTime("00:00"), 0);
  assert.equal(parseTime("23:59"), 1439);
  assert.equal(parseTime("24:00"), null);
  assert.equal(parseTime("9:00"), null);
  assert.equal(formatTime(545), "09:05");
});

test("validates manual weekly blocks and rejects overnight ranges", () => {
  const valid = validateCalendarBlockInput({ title: " Focus work ", notes: " Build ", category: "focus", dayOfWeek: 2, startTime: "09:00", endTime: "10:30" });
  assert.deepEqual(valid.value, { title: "Focus work", notes: "Build", category: "focus", dayOfWeek: 2, startMinutes: 540, endMinutes: 630 });
  assert.match(validateCalendarBlockInput({ ...valid.value, startTime: "22:00", endTime: "01:00" }).error, /later than start/);
});

test("accepts real IANA timezones and rejects invented ones", () => {
  assert.equal(isValidTimezone("Europe/Stockholm"), true);
  assert.equal(isValidTimezone("Mars/Olympus"), false);
});

test("expands a versioned schedule across weekdays and reports overlaps", () => {
  const result = validateScheduleImport({
    version: 1,
    timezone: "Europe/Stockholm",
    blocks: [
      { title: "Work", category: "fixed", days: ["monday", "tuesday"], start: "07:00", end: "15:30" },
      { title: "Lunch", category: "routine", days: ["monday"], start: "12:00", end: "12:30" },
    ],
  });
  assert.equal(result.valid, true);
  assert.equal(result.blocks.length, 3);
  assert.equal(result.blocks[0].dayOfWeek, 0);
  assert.match(result.warnings[0], /overlapping blocks/);
});

test("rejects malformed imports without silently dropping invalid data", () => {
  const result = validateScheduleImport({ version: 2, timezone: "Bad/Zone", blocks: [{ title: "Work", category: "fixed", days: ["funday"], start: "9", end: "10" }] });
  assert.equal(result.valid, false);
  assert.equal(result.blocks.length, 0);
  assert.ok(result.errors.length >= 3);
});

test("public calendar blocks omit owner identity and expose readable times", () => {
  const input = validateCalendarBlockInput({ title: "Walk", notes: "Dogs", category: "routine", dayOfWeek: 0, startTime: "06:00", endTime: "06:30" }).value;
  const record = createCalendarBlockRecord(input, "2026-09-04T08:00:00.000Z", "block-1", "owner-a");
  const output = toPublicCalendarBlock(record);
  assert.equal("ownerId" in output, false);
  assert.equal(output.startTime, "06:00");
});

test("detects true overlaps but allows adjacent blocks", () => {
  const first = { dayOfWeek: 0, startMinutes: 540, endMinutes: 600 };
  assert.equal(blocksOverlap(first, { dayOfWeek: 0, startMinutes: 570, endMinutes: 630 }), true);
  assert.equal(blocksOverlap(first, { dayOfWeek: 0, startMinutes: 600, endMinutes: 630 }), false);
  assert.equal(blocksOverlap(first, { dayOfWeek: 1, startMinutes: 570, endMinutes: 630 }), false);
});

test("chunks expanded imports below Cloudflare D1's parameter limit", () => {
  const records = Array.from({ length: 12 }, (_, index) => ({ id: `block-${index}` }));
  const chunks = chunkCalendarBlockRecords(records);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [9, 3]);
  assert.ok(chunks.every((chunk) => chunk.length * 11 <= 100));
});

test("finds the next local occurrence and advances after the block ends", () => {
  const beforeBlockEnds = new Date("2026-09-09T05:00:00.000Z"); // 07:00 in Stockholm
  const afterBlockEnds = new Date("2026-09-09T07:00:00.000Z"); // 09:00 in Stockholm
  assert.equal(dateKeyInTimezone(beforeBlockEnds, "Europe/Stockholm"), "2026-09-09");
  assert.equal(dayOfWeekForDateKey("2026-09-09"), 2);
  assert.equal(nextOccurrenceDate(2, 510, "Europe/Stockholm", beforeBlockEnds), "2026-09-09");
  assert.equal(nextOccurrenceDate(2, 510, "Europe/Stockholm", afterBlockEnds), "2026-09-16");
});

test("validates a future occurrence against the recurring block weekday", () => {
  assert.deepEqual(validateTaskOccurrenceDate("2026-09-09", 2, "2026-09-04"), { value: "2026-09-09" });
  assert.match(validateTaskOccurrenceDate("2026-09-10", 2, "2026-09-04").error, /wednesday/);
  assert.match(validateTaskOccurrenceDate("2026-09-02", 2, "2026-09-04").error, /future/);
  assert.match(validateTaskOccurrenceDate("2026-02-30", 2, "2026-09-04").error, /real/);
});

test("creates a reservation that snapshots the block time and timezone", () => {
  const now = "2026-09-04T09:00:00.000Z";
  assert.deepEqual(createTaskScheduleRecord({
    taskId: "task-1",
    ownerId: "owner-a",
    sourceBlockId: "block-1",
    scheduledDate: "2026-09-09",
    startMinutes: 390,
    endMinutes: 510,
    timezone: "Europe/Stockholm",
  }, now, "schedule-1"), {
    id: "schedule-1",
    taskId: "task-1",
    ownerId: "owner-a",
    sourceBlockId: "block-1",
    scheduledDate: "2026-09-09",
    startMinutes: 390,
    endMinutes: 510,
    timezone: "Europe/Stockholm",
    createdAt: now,
    updatedAt: now,
  });
});
