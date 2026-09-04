"use client";

import { useState } from "react";
import { AlertTriangle, CalendarCheck2, CheckCircle2, ChevronLeft, FileJson2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarImportPreview } from "@/lib/calendar-types";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const example = `{
  "version": 1,
  "timezone": "Europe/Stockholm",
  "blocks": [
    {
      "title": "Work",
      "category": "fixed",
      "days": ["monday", "tuesday", "thursday"],
      "start": "07:00",
      "end": "15:30",
      "notes": "Office hours"
    },
    {
      "title": "Hold the Island",
      "category": "protected",
      "days": ["wednesday", "friday"],
      "start": "09:00",
      "end": "10:30"
    }
  ]
}`;

export function CalendarImport({ userName, accessToken, onSignOut }: { userName: string; accessToken: string; onSignOut: () => void }) {
  const [json, setJson] = useState("");
  const [parsed, setParsed] = useState<unknown>(null);
  const [preview, setPreview] = useState<CalendarImportPreview | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ importedCount: number; skippedCount: number; timezone: string } | null>(null);

  async function validate() {
    setError("");
    setPreview(null);
    setResult(null);
    let schedule: unknown;
    try {
      schedule = JSON.parse(json);
    } catch {
      setError("This is not valid JSON. Check commas, quotation marks, and brackets.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/calendar/import/preview", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(schedule),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setParsed(schedule);
      setPreview(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The schedule could not be validated.");
    } finally {
      setBusy(false);
    }
  }

  async function importSchedule() {
    if (!preview?.valid || !parsed) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/calendar/import", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(parsed),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResult(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The schedule could not be imported.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070c16] text-slate-100">
      <div className="fixed inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_18%_0%,rgba(34,211,238,0.13),transparent_42%),radial-gradient(circle_at_82%_10%,rgba(139,92,246,0.09),transparent_35%)]" aria-hidden="true" />
      <div className="relative mx-auto max-w-5xl px-4 py-6 sm:px-7 sm:py-9 lg:px-10">
        <header className="border-b border-white/8 pb-7">
          <a href="/calendar" className="inline-flex min-h-10 items-center gap-2 text-sm text-slate-400 hover:text-white"><ChevronLeft className="size-4" /> Weekly calendar</a>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300"><FileJson2 className="size-4" /> Schedule import</div><h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Validate before anything changes</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Signed in as {userName}. Import adds recurring blocks to your current calendar. It never replaces existing blocks.</p></div>
            <button onClick={onSignOut} className="text-sm text-slate-400 underline underline-offset-4 hover:text-white">Sign out</button>
          </div>
        </header>

        {error && <div role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</div>}

        {result ? (
          <section className="mt-8 rounded-3xl border border-emerald-400/20 bg-emerald-400/8 p-7 text-center">
            <CalendarCheck2 className="mx-auto size-10 text-emerald-300" />
            <h2 className="mt-4 text-2xl font-semibold text-white">Schedule imported</h2>
            <p className="mt-2 text-slate-300">Added {result.importedCount} weekly blocks and skipped {result.skippedCount} exact duplicates. Timezone: {result.timezone}.</p>
            <Button asChild className="mt-6 bg-cyan-300 text-slate-950 hover:bg-cyan-200"><a href="/calendar">View calendar</a></Button>
          </section>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
              <div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-white">1. Paste Project Pulse JSON</h2><p className="mt-1 text-sm text-slate-500">Nothing is stored during validation.</p></div><button onClick={() => setJson(example)} className="text-xs font-semibold text-cyan-300 underline underline-offset-4">Load example</button></div>
              <Textarea value={json} onChange={(event) => { setJson(event.target.value); setPreview(null); }} spellCheck={false} placeholder={example} className="mt-4 min-h-[430px] resize-y border-white/10 bg-[#080f1c] font-mono text-xs leading-5" />
              <Button onClick={() => void validate()} disabled={busy || !json.trim()} className="mt-4 w-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">{busy ? "Validating…" : "Validate and preview"}</Button>
            </section>

            <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-5">
              <h2 className="font-semibold text-white">2. Review preview</h2>
              {!preview ? <div className="grid min-h-[430px] place-items-center text-center text-sm text-slate-600"><div><ShieldCheck className="mx-auto mb-3 size-8" /><p>Your validated weekly blocks will appear here.</p></div></div> : (
                <div className="mt-4">
                  <div className={`rounded-xl border px-4 py-3 text-sm ${preview.valid ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-100" : "border-red-400/25 bg-red-400/10 text-red-100"}`}>
                    {preview.valid ? <span className="flex items-center gap-2"><CheckCircle2 className="size-4" />Valid version 1 schedule · {preview.timezone}</span> : "Validation failed. Fix the errors and validate again."}
                  </div>
                  {preview.errors.length > 0 && <ul className="mt-4 grid gap-2 text-sm text-red-200">{preview.errors.map((item) => <li key={item}>• {item}</li>)}</ul>}
                  {preview.warnings.length > 0 && <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/8 p-3"><p className="flex items-center gap-2 text-sm font-semibold text-amber-200"><AlertTriangle className="size-4" />Review warnings</p><ul className="mt-2 grid gap-1 text-xs leading-5 text-amber-100/80">{preview.warnings.map((item) => <li key={item}>• {item}</li>)}</ul></div>}
                  <div className="mt-4 max-h-[340px] overflow-auto pr-1">
                    {days.map((day, dayOfWeek) => {
                      const dayBlocks = preview.blocks.filter((block) => block.dayOfWeek === dayOfWeek);
                      return dayBlocks.length ? <div key={day} className="mb-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{day}</h3><div className="grid gap-2">{dayBlocks.map((block, index) => <article key={`${block.sourceIndex}-${dayOfWeek}-${index}`} className="rounded-lg border border-white/8 bg-white/5 px-3 py-2"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium text-white">{block.title}</p><span className="shrink-0 text-xs text-slate-400">{block.startTime}–{block.endTime}</span></div><p className="mt-1 text-xs capitalize text-cyan-300">{block.category}</p></article>)}</div></div> : null;
                    })}
                  </div>
                  <Button onClick={() => void importSchedule()} disabled={busy || !preview.valid} className="mt-4 w-full bg-emerald-300 text-slate-950 hover:bg-emerald-200">{busy ? "Importing…" : `Import ${preview.blocks.length - preview.duplicateCount} new blocks`}</Button>
                </div>
              )}
            </section>
          </div>
        )}

        <section className="mt-6 rounded-2xl border border-white/8 bg-white/[0.025] p-5 text-sm leading-6 text-slate-400">
          <h2 className="font-semibold text-white">JSON contract</h2>
          <p className="mt-2">Use <code className="text-cyan-300">version: 1</code>, an IANA timezone, and one or more blocks. Each block needs a title, category, weekday names, and 24-hour start/end times. Supported categories are fixed, protected, focus, flexible, and routine. Overlaps produce warnings; malformed data prevents import.</p>
        </section>
      </div>
    </main>
  );
}
