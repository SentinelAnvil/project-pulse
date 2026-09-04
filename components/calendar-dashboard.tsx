"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock3, FileJson2, ListPlus, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { CalendarBlock, CalendarBlockInput, CalendarCategory } from "@/lib/calendar-types";
import { nextOccurrenceDate, parseTime } from "@/lib/calendar-domain.mjs";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const categories: { value: CalendarCategory; label: string; description: string; style: string }[] = [
  { value: "fixed", label: "Fixed", description: "A commitment that cannot move", style: "border-rose-400/30 bg-rose-400/10 text-rose-200" },
  { value: "protected", label: "Protected", description: "Time Project Pulse must never schedule over", style: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  { value: "focus", label: "Focus", description: "Reserved deep-work time", style: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" },
  { value: "flexible", label: "Flexible", description: "Time that may be rearranged", style: "border-violet-400/30 bg-violet-400/10 text-violet-200" },
  { value: "routine", label: "Routine", description: "A repeating habit or responsibility", style: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
];
const blankBlock: CalendarBlockInput = { title: "", notes: "", category: "fixed", dayOfWeek: 0, startTime: "09:00", endTime: "10:00" };
type TaskFromBlockForm = { title: string; description: string; scheduledDate: string };

function categoryInfo(category: CalendarCategory) {
  return categories.find((item) => item.value === category) ?? categories[0];
}

export function CalendarDashboard({ userName, accessToken, onSignOut }: { userName: string; accessToken: string; onSignOut: () => void }) {
  const [blocks, setBlocks] = useState<CalendarBlock[]>([]);
  const [timezone, setTimezone] = useState("UTC");
  const [timezoneDraft, setTimezoneDraft] = useState("UTC");
  const [timezoneSaved, setTimezoneSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CalendarBlock | null>(null);
  const [form, setForm] = useState<CalendarBlockInput>(blankBlock);
  const [deleting, setDeleting] = useState<CalendarBlock | null>(null);
  const [taskBlock, setTaskBlock] = useState<CalendarBlock | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFromBlockForm>({ title: "", description: "", scheduledDate: "" });

  useEffect(() => {
    fetch("/api/calendar", { headers: { authorization: `Bearer ${accessToken}` } })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as { timezone: string; hasCustomTimezone: boolean; blocks: CalendarBlock[] };
      })
      .then((data) => {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const initialTimezone = data.hasCustomTimezone ? data.timezone : browserTimezone;
        setBlocks(data.blocks);
        setTimezone(initialTimezone);
        setTimezoneDraft(initialTimezone);
        setTimezoneSaved(data.hasCustomTimezone);
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "The calendar could not be loaded."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const grouped = useMemo(() => days.map((_, dayOfWeek) => blocks
    .filter((block) => block.dayOfWeek === dayOfWeek)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))), [blocks]);

  function openNew(dayOfWeek = 0) {
    setEditing(null);
    setForm({ ...blankBlock, dayOfWeek });
    setError("");
    setDialogOpen(true);
  }

  function openEdit(block: CalendarBlock) {
    setEditing(block);
    setForm({ title: block.title, notes: block.notes, category: block.category, dayOfWeek: block.dayOfWeek, startTime: block.startTime, endTime: block.endTime });
    setError("");
    setDialogOpen(true);
  }

  function openTask(block: CalendarBlock) {
    setTaskBlock(block);
    setTaskForm({
      title: block.title,
      description: block.notes,
      scheduledDate: nextOccurrenceDate(block.dayOfWeek, parseTime(block.endTime), timezone),
    });
    setError("");
  }

  async function createTaskFromBlock(event: FormEvent) {
    event.preventDefault();
    if (!taskBlock) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/calendar/blocks/${taskBlock.id}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(taskForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTaskBlock(null);
      setNotice(`Task created for ${taskForm.scheduledDate} at ${taskBlock.startTime}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The task could not be created from this block.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBlock(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/calendar/blocks/${editing.id}` : "/api/calendar/blocks", {
        method: editing ? "PUT" : "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setBlocks((current) => editing ? current.map((block) => block.id === data.block.id ? data.block : block) : [...current, data.block]);
      setDialogOpen(false);
      setNotice(editing ? "Calendar block updated." : "Calendar block added.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The calendar block could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBlock() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/calendar/blocks/${deleting.id}`, { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } });
      if (!response.ok) throw new Error("The calendar block could not be deleted.");
      setBlocks((current) => current.filter((block) => block.id !== deleting.id));
      setDeleting(null);
      setNotice("Calendar block deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The calendar block could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTimezone() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/calendar/settings", {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ timezone: timezoneDraft }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setTimezone(data.timezone);
      setTimezoneSaved(true);
      setNotice("Calendar timezone saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The timezone could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070c16] text-slate-100">
      <div className="fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.13),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(139,92,246,0.09),transparent_35%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        <header className="flex flex-col gap-6 border-b border-white/8 pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300"><CalendarDays className="size-4" /> Weekly calendar</div>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Shape your default week</h1>
            <p className="mt-2 text-sm text-slate-400">Signed in as {userName} · <a href="/dashboard" className="underline underline-offset-4 hover:text-white">Tasks</a> · <button onClick={onSignOut} className="underline underline-offset-4 hover:text-white">Sign out</button></p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/10 bg-transparent"><a href="/calendar/import"><FileJson2 /> Import JSON</a></Button>
            <Button onClick={() => openNew()} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200"><Plus /> Add block</Button>
          </div>
        </header>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</div>}
        {notice && <div role="status" className="mt-6 rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">{notice}</div>}

        <section className="mt-7 grid gap-5 rounded-2xl border border-white/8 bg-white/[0.035] p-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <label htmlFor="timezone" className="text-sm font-semibold text-white">Calendar timezone</label>
            <p className="mt-1 text-sm text-slate-500">Weekly times are interpreted in this timezone. Current: {timezone}</p>
            <Input id="timezone" value={timezoneDraft} onChange={(event) => setTimezoneDraft(event.target.value)} placeholder="Europe/Stockholm" className="mt-3 max-w-sm border-white/10 bg-white/5" />
          </div>
          <Button variant="outline" disabled={busy || (timezoneSaved && timezoneDraft === timezone)} onClick={() => void saveTimezone()} className="border-white/10 bg-transparent">Save timezone</Button>
        </section>

        <section aria-label="Calendar block types" className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => <span key={category.value} title={category.description} className={`rounded-full border px-3 py-1 text-xs font-semibold ${category.style}`}>{category.label}</span>)}
        </section>

        {loading ? <div className="mt-8 h-72 animate-pulse rounded-2xl bg-white/[0.035]" /> : (
          <section aria-label="Recurring weekly calendar" className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
            {days.map((day, dayOfWeek) => (
              <div key={day} className="min-h-56 min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-white">{day}</h2>
                  <button onClick={() => openNew(dayOfWeek)} aria-label={`Add block on ${day}`} className="grid size-8 place-items-center rounded-lg text-slate-500 hover:bg-white/10 hover:text-white"><Plus className="size-4" /></button>
                </div>
                <div className="min-w-0 grid gap-2">
                  {grouped[dayOfWeek].map((block) => {
                    const category = categoryInfo(block.category);
                    return (
                      <article key={block.id} className={`min-w-0 overflow-hidden rounded-xl border p-3 ${category.style}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{block.title}</p>
                            <p className="mt-1 flex items-center gap-1 text-xs opacity-80"><Clock3 className="size-3" />{block.startTime}–{block.endTime}</p>
                          </div>
                          {block.category === "protected" && <ShieldCheck className="size-4 shrink-0" aria-label="Protected time" />}
                        </div>
                        {block.notes && <p className="mt-2 line-clamp-2 break-words text-xs leading-5 opacity-75">{block.notes}</p>}
                        <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-1">
                          <button onClick={() => openTask(block)} className="flex min-h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-xs font-semibold hover:bg-black/15" aria-label={`Create task from ${block.title}`}><ListPlus className="size-3.5 shrink-0" /> <span className="truncate">Create task</span></button>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => openEdit(block)} aria-label={`Edit ${block.title}`} className="grid size-7 place-items-center rounded-md hover:bg-black/15"><Pencil className="size-3.5" /></button>
                            <button onClick={() => setDeleting(block)} aria-label={`Delete ${block.title}`} className="grid size-7 place-items-center rounded-md hover:bg-black/15"><Trash2 className="size-3.5" /></button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {!grouped[dayOfWeek].length && <p className="py-5 text-center text-xs text-slate-600">Open day</p>}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-white/10 bg-[#101829] text-white sm:max-w-xl">
          <form onSubmit={saveBlock} className="grid gap-4">
            <DialogHeader><DialogTitle>{editing ? "Edit weekly block" : "Add weekly block"}</DialogTitle><DialogDescription className="text-slate-400">This block repeats every week until you edit or delete it.</DialogDescription></DialogHeader>
            <label className="grid gap-2 text-sm">Title<Input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="border-white/10 bg-white/5" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm">Day<select value={form.dayOfWeek} onChange={(event) => setForm({ ...form, dayOfWeek: Number(event.target.value) })} className="h-9 rounded-md border border-white/10 bg-[#111b2d] px-3">{days.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Type<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as CalendarCategory })} className="h-9 rounded-md border border-white/10 bg-[#111b2d] px-3">{categories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
              <label className="grid gap-2 text-sm">Start<Input required type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="border-white/10 bg-white/5 [color-scheme:dark]" /></label>
              <label className="grid gap-2 text-sm">End<Input required type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className="border-white/10 bg-white/5 [color-scheme:dark]" /></label>
            </div>
            <label className="grid gap-2 text-sm">Notes <span className="sr-only">optional</span><Textarea maxLength={1000} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-20 border-white/10 bg-white/5" /></label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <p className="text-xs text-slate-500">{categoryInfo(form.category).description}</p>
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button><Button type="submit" disabled={busy} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{busy ? "Saving…" : "Save block"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(taskBlock)} onOpenChange={(open) => { if (!open) setTaskBlock(null); }}>
        <DialogContent className="border-white/10 bg-[#101829] text-white sm:max-w-xl">
          <form onSubmit={createTaskFromBlock} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Create one task from this block</DialogTitle>
              <DialogDescription className="text-slate-400">The task gets this occurrence; the weekly block continues unchanged.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100">
              {taskBlock && <><span className="font-semibold">{days[taskBlock.dayOfWeek]}</span> · {taskBlock.startTime}–{taskBlock.endTime} · {timezone}</>}
            </div>
            <label className="grid gap-2 text-sm">Task title<Input autoFocus required maxLength={120} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} className="border-white/10 bg-white/5" /></label>
            <label className="grid gap-2 text-sm">Occurrence date<Input required type="date" value={taskForm.scheduledDate} onChange={(event) => setTaskForm({ ...taskForm, scheduledDate: event.target.value })} className="border-white/10 bg-white/5 [color-scheme:dark]" /><span className="text-xs text-slate-500">Choose a {taskBlock ? days[taskBlock.dayOfWeek] : "matching weekday"}; this does not create future copies.</span></label>
            <label className="grid gap-2 text-sm">Notes <span className="sr-only">optional</span><Textarea maxLength={2000} value={taskForm.description} onChange={(event) => setTaskForm({ ...taskForm, description: event.target.value })} className="min-h-24 border-white/10 bg-white/5" /></label>
            {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
            <DialogFooter><Button type="button" variant="ghost" onClick={() => setTaskBlock(null)} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy || !taskForm.title.trim() || !taskForm.scheduledDate} className="bg-cyan-300 text-slate-950 hover:bg-cyan-200">{busy ? "Creating…" : "Create task"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent className="border-white/10 bg-[#101829] text-white"><AlertDialogHeader><AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle><AlertDialogDescription className="text-slate-400">This removes the recurring block from every week.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="border-white/10 bg-transparent">Keep block</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void deleteBlock()}>Delete block</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
