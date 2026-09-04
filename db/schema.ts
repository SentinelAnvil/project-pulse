import { index, integer, text, sqliteTable, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    dueDate: text("due_date"),
    status: text("status", { enum: ["active", "completed"] })
      .notNull()
      .default("active"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastTouchedAt: text("last_touched_at").notNull(),
    completedAt: text("completed_at"),
  },
  (table) => [index("idx_tasks_owner_id").on(table.ownerId)],
);

export const calendarSettings = sqliteTable("calendar_settings", {
  ownerId: text("owner_id").primaryKey(),
  timezone: text("timezone").notNull().default("UTC"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const calendarBlocks = sqliteTable(
  "calendar_blocks",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    title: text("title").notNull(),
    notes: text("notes").notNull().default(""),
    category: text("category", {
      enum: ["fixed", "protected", "focus", "flexible", "routine"],
    }).notNull(),
    dayOfWeek: integer("day_of_week").notNull(),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
    source: text("source", { enum: ["manual", "import"] }).notNull().default("manual"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("idx_calendar_blocks_owner_day").on(table.ownerId, table.dayOfWeek),
    uniqueIndex("idx_calendar_blocks_exact_unique").on(
      table.ownerId,
      table.dayOfWeek,
      table.startMinutes,
      table.endMinutes,
      table.title,
      table.category,
    ),
  ],
);
