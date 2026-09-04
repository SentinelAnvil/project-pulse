"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Task, TaskInput } from "@/lib/task-types";
import { categorizeTasks, localDateKey } from "@/lib/task-rules.mjs";

const blankTask: TaskInput = { title: "", description: "", dueDate: null };

function readableDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(`${value}T12:00:00`),
  );
}

function attentionLabel(task: Task) {
  if (task.dueDate && task.dueDate < localDateKey(new Date())) {
    return `Overdue since ${readableDate(task.dueDate)}`;
  }
  const days = Math.floor((Date.now() - new Date(task.lastTouchedAt).getTime()) / 86_400_000);
  return `Untouched for ${days} days`;
}

type TaskDialogProps = {
  open: boolean;
  task: Task | null;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (input: TaskInput) => Promise<void>;
};

function TaskDialog({ open, task, busy, error, onOpenChange, onSave }: TaskDialogProps) {
  const [form, setForm] = useState<TaskInput>(() =>
    task
      ? { title: task.title, description: task.description, dueDate: task.dueDate }
      : blankTask,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#101829] text-white sm:max-w-xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{task ? "Edit task" : "Add a task"}</DialogTitle>
            <DialogDescription className="text-slate-400">
              A due date is optional. Tasks also surface automatically after seven untouched days.
            </DialogDescription>
          </DialogHeader>

          {error && <div role="alert" className="rounded-lg border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-100">{error}</div>}

          <label className="grid gap-2 text-sm font-medium">
            Title
            <Input
              autoFocus
              required
              maxLength={120}
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="What needs your attention?"
              className="h-11 border-white/10 bg-white/5"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Notes <span className="sr-only">optional</span>
            <Textarea
              maxLength={2000}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Add context or define the next step"
              className="min-h-28 border-white/10 bg-white/5"
            />
          </label>

          <label className="grid gap-2 text-sm font-medium">
            Due date <span className="font-normal text-slate-400">Optional</span>
            <Input
              type="date"
              value={form.dueDate ?? ""}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })}
              className="h-11 border-white/10 bg-white/5 [color-scheme:dark]"
            />
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !form.title.trim()} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">
              {busy ? "Saving…" : task ? "Save changes" : "Add task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type TaskCardProps = {
  task: Task;
  tone: "neglected" | "active" | "completed";
  busy: boolean;
  onEdit: (task: Task) => void;
  onAction: (task: Task, action: "touch" | "complete" | "reopen") => void;
  onDelete: (task: Task) => void;
};

function TaskCard({ task, tone, busy, onEdit, onAction, onDelete }: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const edge = tone === "neglected" ? "border-l-amber-400" : tone === "completed" ? "border-l-emerald-400" : "border-l-cyan-400";

  return (
    <article className={`group rounded-2xl border border-white/8 border-l-4 ${edge} bg-white/[0.035] p-4 shadow-[0_18px_45px_rgba(0,0,0,0.12)] transition hover:border-white/15 sm:p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className={`text-base font-semibold leading-6 ${tone === "completed" ? "text-slate-300 line-through decoration-slate-600" : "text-white"}`}>
            {task.title}
          </h3>
          {task.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{task.description}</p>}
        </div>
        <div className="relative shrink-0">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={busy}
            aria-label={`More actions for ${task.title}`}
            aria-expanded={actionsOpen}
            onClick={() => setActionsOpen((open) => !open)}
            className="text-slate-500 hover:text-white"
          >
            <MoreHorizontal />
          </Button>
          {actionsOpen && (
            <div className="absolute right-0 top-10 z-10 grid min-w-32 gap-1 rounded-xl border border-white/10 bg-[#111b2d] p-1.5 shadow-2xl">
              <button
                type="button"
                onClick={() => { setActionsOpen(false); onEdit(task); }}
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-slate-200 hover:bg-white/10"
              >
                <Pencil className="size-4" /> Edit
              </button>
              <button
                type="button"
                onClick={() => { setActionsOpen(false); setConfirmDelete(true); }}
                className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm text-red-300 hover:bg-white/10"
              >
                <Trash2 className="size-4" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-slate-400">
        {tone === "neglected" ? (
          <span className="inline-flex items-center gap-1.5 text-amber-300"><Clock3 className="size-3.5" />{attentionLabel(task)}</span>
        ) : tone === "completed" && task.completedAt ? (
          <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5" />Completed {new Date(task.completedAt).toLocaleDateString()}</span>
        ) : task.dueDate ? (
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />Due {readableDate(task.dueDate)}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5"><CircleDot className="size-3.5" />In motion</span>
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {tone === "completed" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(task, "reopen")} className="border-white/10 bg-transparent hover:bg-white/10">
            <RefreshCw /> Reopen
          </Button>
        ) : (
          <>
            <Button size="sm" disabled={busy} onClick={() => onAction(task, "complete")} className="bg-white text-slate-950 hover:bg-slate-200">
              <Check /> Complete
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction(task, "touch")} className="border-white/10 bg-transparent hover:bg-white/10">
              <Activity /> Worked on it
            </Button>
          </>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className="border-white/10 bg-[#101829] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{task.title}”?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">This removes the task and its progress history permanently.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-transparent">Keep task</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete(task)}>Delete task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}

function TaskSection({ title, description, tasks, tone, busyId, onEdit, onAction, onDelete }: {
  title: string;
  description: string;
  tasks: Task[];
  tone: TaskCardProps["tone"];
  busyId: string | null;
  onEdit: TaskCardProps["onEdit"];
  onAction: TaskCardProps["onAction"];
  onDelete: TaskCardProps["onDelete"];
}) {
  return (
    <section aria-labelledby={`${tone}-heading`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 id={`${tone}-heading`} className="text-lg font-semibold text-white">{title}</h2>
            <span className="rounded-full bg-white/8 px-2 py-0.5 text-xs font-semibold text-slate-300">{tasks.length}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {tasks.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {tasks.map((task) => <TaskCard key={task.id} task={task} tone={tone} busy={busyId === task.id} onEdit={onEdit} onAction={onAction} onDelete={onDelete} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 px-5 py-8 text-center text-sm text-slate-500">
          {tone === "neglected" ? "Nothing is slipping. Keep the pulse steady." : tone === "active" ? "No active tasks yet." : "Completed work will collect here."}
        </div>
      )}
    </section>
  );
}

export function PulseDashboard({
  userName,
  accessToken,
  onSignOut,
}: {
  userName: string;
  accessToken: string;
  onSignOut: () => void;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const groups = useMemo(() => categorizeTasks(tasks, new Date(clock)), [tasks, clock]);

  async function loadTasks() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/tasks", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks(data.tasks);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tasks could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tasks", {
      headers: { authorization: `Bearer ${accessToken}` },
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data.tasks as Task[];
      })
      .then((loadedTasks) => {
        if (!cancelled) setTasks(loadedTasks);
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Tasks could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    const refreshClock = () => setClock(Date.now());
    const interval = window.setInterval(refreshClock, 60_000);
    document.addEventListener("visibilitychange", refreshClock);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshClock);
    };
  }, []);

  async function saveTask(input: TaskInput) {
    setSaving(true);
    setError(null);
    setFormError(null);
    try {
      const response = await fetch(editing ? `/api/tasks/${editing.id}` : "/api/tasks", {
        method: editing ? "PUT" : "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(input),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks((current) => editing ? current.map((item) => item.id === data.task.id ? data.task : item) : [data.task, ...current]);
      setDialogOpen(false);
      setEditing(null);
      setNotice(editing ? "Task updated." : "Task added.");
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The task could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function runAction(task: Task, action: "touch" | "complete" | "reopen") {
    setBusyId(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTasks((current) => current.map((item) => item.id === task.id ? data.task : item));
      setNotice(action === "complete" ? "Task completed." : action === "reopen" ? "Task reopened." : "Task attention refreshed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The task could not be updated.");
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTask(task: Task) {
    setBusyId(task.id);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("The task could not be deleted.");
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setNotice("Task deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The task could not be deleted.");
    } finally {
      setBusyId(null);
    }
  }

  const sectionProps = { busyId, onEdit: (task: Task) => { setEditing(task); setFormError(null); setDialogOpen(true); }, onAction: runAction, onDelete: deleteTask };

  return (
    <main className="min-h-screen bg-[#070c16] text-slate-100">
      <div className="fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.13),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(251,191,36,0.08),transparent_35%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/8 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
              <Activity className="size-4" /> Project Pulse
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">What needs attention?</h1>
            <p className="mt-2 text-sm text-slate-400">
              Signed in as {userName} ·{" "}
              {/* A plain navigation avoids loading the full client router in the Worker bundle. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="underline underline-offset-4 hover:text-white">Home</a> ·{" "}
              <a href="/calendar" className="underline underline-offset-4 hover:text-white">Calendar</a> ·{" "}
              <button type="button" onClick={onSignOut} className="underline underline-offset-4 hover:text-white">Sign out</button>
            </p>
          </div>
          <Button size="lg" onClick={() => { setEditing(null); setFormError(null); setDialogOpen(true); }} className="h-11 bg-cyan-300 px-5 text-slate-950 hover:bg-cyan-200">
            <Plus /> Add task
          </Button>
        </header>

        {error && (
          <div role="alert" className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            <span>{error}</span>
            <Button size="sm" variant="ghost" onClick={() => void loadTasks()}>Try again</Button>
          </div>
        )}
        {notice && (
          <div role="status" className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} className="min-h-8 px-2 text-xs font-semibold text-emerald-200 hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        <section aria-label="Task summary" className="grid gap-3 py-7 sm:grid-cols-3">
          {[
            { label: "Needs attention", value: groups.neglected.length, color: "text-amber-300", icon: Clock3 },
            { label: "In motion", value: groups.active.length, color: "text-cyan-300", icon: CircleDot },
            { label: "Completed", value: groups.completed.length, color: "text-emerald-300", icon: CheckCircle2 },
          ].map(({ label, value, color, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
              <div className={`flex items-center gap-2 text-sm font-medium ${color}`}><Icon className="size-4" />{label}</div>
              <p className="mt-3 text-4xl font-semibold tabular-nums text-white">{loading ? "—" : value}</p>
            </article>
          ))}
        </section>

        {loading ? (
          <div className="grid gap-3" aria-label="Loading tasks">
            {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-2xl border border-white/5 bg-white/[0.025]" />)}
          </div>
        ) : (
          <div className="grid gap-10 pb-16">
            <TaskSection title="Needs attention" description="Overdue or untouched for seven days" tasks={groups.neglected} tone="neglected" {...sectionProps} />
            <TaskSection title="In motion" description="Current work with a healthy pulse" tasks={groups.active} tone="active" {...sectionProps} />
            <TaskSection title="Recently completed" description="Your visible record of progress" tasks={groups.completed} tone="completed" {...sectionProps} />
          </div>
        )}
      </div>

      <TaskDialog key={`${editing?.id ?? "new"}-${dialogOpen}`} open={dialogOpen} task={editing} busy={saving} error={formError} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditing(null); setFormError(null); } }} onSave={saveTask} />
    </main>
  );
}
