export const CALENDAR_CATEGORIES = ["fixed", "protected", "focus", "flexible", "routine"];
export const CALENDAR_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const CALENDAR_BLOCK_PARAMETER_COUNT = 11;
const D1_MAX_BOUND_PARAMETERS = 100;

export function parseTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function isValidDateKey(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function dayOfWeekForDateKey(value) {
  if (!isValidDateKey(value)) return null;
  const sundayBasedDay = new Date(`${value}T12:00:00.000Z`).getUTCDay();
  return sundayBasedDay === 0 ? 6 : sundayBasedDay - 1;
}

export function dateKeyInTimezone(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function nextOccurrenceDate(dayOfWeek, endMinutes, timezone, now = new Date()) {
  const dateKey = dateKeyInTimezone(now, timezone);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute);
  const currentDay = dayOfWeekForDateKey(dateKey);
  let daysAhead = (dayOfWeek - currentDay + 7) % 7;
  if (daysAhead === 0 && currentMinutes >= endMinutes) daysAhead = 7;

  const date = new Date(`${dateKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

export function validateTaskOccurrenceDate(value, blockDayOfWeek, todayDateKey) {
  if (!isValidDateKey(value)) return { error: "Choose a real occurrence date." };
  if (value < todayDateKey) return { error: "Choose today or a future occurrence." };
  if (dayOfWeekForDateKey(value) !== blockDayOfWeek) {
    return { error: `Choose a ${CALENDAR_DAYS[blockDayOfWeek]} occurrence for this block.` };
  }
  return { value };
}

export function createTaskScheduleRecord({ taskId, ownerId, sourceBlockId, scheduledDate, startMinutes, endMinutes, timezone }, now, id) {
  return { id, taskId, ownerId, sourceBlockId, scheduledDate, startMinutes, endMinutes, timezone, createdAt: now, updatedAt: now };
}

export function chunkCalendarBlockRecords(records) {
  const rowsPerQuery = Math.floor(D1_MAX_BOUND_PARAMETERS / CALENDAR_BLOCK_PARAMETER_COUNT);
  const chunks = [];
  for (let index = 0; index < records.length; index += rowsPerQuery) {
    chunks.push(records.slice(index, index + rowsPerQuery));
  }
  return chunks;
}

export function isValidTimezone(value) {
  if (typeof value !== "string" || !value || value.length > 80) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}

export function validateCalendarBlockInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { error: "A calendar block object is required." };
  }

  const title = typeof input.title === "string" ? input.title.trim() : "";
  const notes = typeof input.notes === "string" ? input.notes.trim() : "";
  const category = input.category;
  const dayOfWeek = input.dayOfWeek;
  const startMinutes = parseTime(input.startTime);
  const endMinutes = parseTime(input.endTime);

  if (!title || title.length > 120) return { error: "Title must contain 1–120 characters." };
  if (input.notes != null && typeof input.notes !== "string") return { error: "Notes must be text." };
  if (notes.length > 1000) return { error: "Notes must be at most 1,000 characters." };
  if (!CALENDAR_CATEGORIES.includes(category)) return { error: "Choose a valid calendar block type." };
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return { error: "Choose a valid weekday." };
  if (startMinutes === null || endMinutes === null) return { error: "Times must use 24-hour HH:mm format." };
  if (endMinutes <= startMinutes) return { error: "End time must be later than start time. Overnight blocks are not supported yet." };

  return { value: { title, notes, category, dayOfWeek, startMinutes, endMinutes } };
}

export function createCalendarBlockRecord(input, now, id, ownerId, source = "manual") {
  return { id, ownerId, ...input, source, createdAt: now, updatedAt: now };
}

export function calendarBlockChanges(input, now) {
  return { ...input, source: "manual", updatedAt: now };
}

export function toPublicCalendarBlock(block) {
  return {
    id: block.id,
    title: block.title,
    notes: block.notes,
    category: block.category,
    dayOfWeek: block.dayOfWeek,
    startTime: formatTime(block.startMinutes),
    endTime: formatTime(block.endMinutes),
    source: block.source,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  };
}

export function validateScheduleImport(input) {
  const errors = [];
  const warnings = [];
  const blocks = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, version: null, timezone: null, blocks, errors: ["The schedule must be a JSON object."], warnings };
  }

  const extraRootKeys = Object.keys(input).filter((key) => !["version", "timezone", "blocks"].includes(key));
  if (extraRootKeys.length) errors.push(`Unknown schedule field${extraRootKeys.length === 1 ? "" : "s"}: ${extraRootKeys.join(", ")}.`);

  if (input.version !== 1) errors.push("version must be 1.");
  if (!isValidTimezone(input.timezone)) errors.push("timezone must be a valid IANA timezone, such as Europe/Stockholm.");
  if (!Array.isArray(input.blocks) || input.blocks.length === 0) {
    errors.push("blocks must contain at least one calendar block.");
  } else if (input.blocks.length > 200) {
    errors.push("A schedule may contain at most 200 block definitions.");
  } else {
    input.blocks.forEach((block, index) => {
      if (!block || typeof block !== "object" || Array.isArray(block)) {
        errors.push(`blocks[${index}] must be an object.`);
        return;
      }
      const extraBlockKeys = Object.keys(block).filter((key) => !["title", "notes", "category", "days", "start", "end"].includes(key));
      if (extraBlockKeys.length) errors.push(`blocks[${index}] has unknown field${extraBlockKeys.length === 1 ? "" : "s"}: ${extraBlockKeys.join(", ")}.`);
      if (!Array.isArray(block.days) || block.days.length === 0) {
        errors.push(`blocks[${index}].days must contain at least one weekday.`);
        return;
      }
      const uniqueDays = [...new Set(block.days)];
      if (uniqueDays.length !== block.days.length) errors.push(`blocks[${index}].days must not contain duplicates.`);
      for (const day of uniqueDays) {
        const dayOfWeek = CALENDAR_DAYS.indexOf(typeof day === "string" ? day.toLowerCase() : "");
        if (dayOfWeek === -1) {
          errors.push(`blocks[${index}] contains an invalid weekday.`);
          continue;
        }
        const validated = validateCalendarBlockInput({
          title: block.title,
          notes: block.notes ?? "",
          category: block.category,
          dayOfWeek,
          startTime: block.start,
          endTime: block.end,
        });
        if (validated.error) {
          errors.push(`blocks[${index}] (${day}): ${validated.error}`);
        } else {
          blocks.push({ ...validated.value, sourceIndex: index });
        }
      }
    });
  }

  if (blocks.length > 400) errors.push("The expanded weekly schedule may contain at most 400 blocks.");

  for (let day = 0; day < 7; day += 1) {
    const dayBlocks = blocks.filter((block) => block.dayOfWeek === day).sort((a, b) => a.startMinutes - b.startMinutes);
    for (let index = 1; index < dayBlocks.length; index += 1) {
      if (dayBlocks[index].startMinutes < dayBlocks[index - 1].endMinutes) {
        warnings.push(`${CALENDAR_DAYS[day]} has overlapping blocks: “${dayBlocks[index - 1].title}” and “${dayBlocks[index].title}”.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    version: input.version === 1 ? 1 : null,
    timezone: isValidTimezone(input.timezone) ? input.timezone : null,
    blocks,
    errors,
    warnings,
  };
}

export function publicImportedBlock(block) {
  return {
    title: block.title,
    notes: block.notes,
    category: block.category,
    dayOfWeek: block.dayOfWeek,
    startTime: formatTime(block.startMinutes),
    endTime: formatTime(block.endMinutes),
    sourceIndex: block.sourceIndex,
  };
}

export function blocksOverlap(first, second) {
  return first.dayOfWeek === second.dayOfWeek && first.startMinutes < second.endMinutes && second.startMinutes < first.endMinutes;
}
