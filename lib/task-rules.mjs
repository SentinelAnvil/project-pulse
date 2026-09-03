export const NEGLECT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isTaskNeglected(task, now = new Date()) {
  if (task.status !== "active") return false;

  const overdue = Boolean(task.dueDate && task.dueDate < localDateKey(now));
  const untouchedForSevenDays =
    now.getTime() - new Date(task.lastTouchedAt).getTime() >= NEGLECT_AFTER_MS;

  return overdue || untouchedForSevenDays;
}

export function categorizeTasks(tasks, now = new Date()) {
  const neglected = tasks
    .filter((task) => isTaskNeglected(task, now))
    .sort((a, b) => {
      const dueA = a.dueDate ?? "9999-12-31";
      const dueB = b.dueDate ?? "9999-12-31";
      return dueA.localeCompare(dueB) || a.lastTouchedAt.localeCompare(b.lastTouchedAt);
    });

  const active = tasks
    .filter((task) => task.status === "active" && !isTaskNeglected(task, now))
    .sort((a, b) => {
      const dueA = a.dueDate ?? "9999-12-31";
      const dueB = b.dueDate ?? "9999-12-31";
      return dueA.localeCompare(dueB) || b.lastTouchedAt.localeCompare(a.lastTouchedAt);
    });

  const completed = tasks
    .filter((task) => task.status === "completed")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return { neglected, active, completed };
}
