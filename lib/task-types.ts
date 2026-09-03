export type TaskStatus = "active" | "completed";

export type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  lastTouchedAt: string;
  completedAt: string | null;
};

export type TaskInput = {
  title: string;
  description: string;
  dueDate: string | null;
};
