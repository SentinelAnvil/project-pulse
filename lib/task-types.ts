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
  schedule: {
    date: string;
    startTime: string;
    endTime: string;
    timezone: string;
    sourceBlockId: string | null;
  } | null;
};

export type TaskInput = {
  title: string;
  description: string;
  dueDate: string | null;
};
