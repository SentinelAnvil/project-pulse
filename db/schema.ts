import { index, text, sqliteTable } from "drizzle-orm/sqlite-core";

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
