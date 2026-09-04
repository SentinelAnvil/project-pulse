import assert from "node:assert/strict";
import test from "node:test";
import {
  blocksOverlap,
  createCalendarBlockRecord,
  formatTime,
  isValidTimezone,
  parseTime,
  toPublicCalendarBlock,
  validateCalendarBlockInput,
  validateScheduleImport,
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
