import {
  Activity,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  ShieldCheck,
} from "lucide-react";

const exampleTasks = [
  { title: "Book the dentist appointment", detail: "Untouched for 9 days", tone: "amber" },
  { title: "Outline the September roadmap", detail: "Due Friday", tone: "cyan" },
  { title: "Submit the expense report", detail: "Completed today", tone: "emerald" },
] as const;

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#070c16] text-slate-100">
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(34,211,238,0.14),transparent_34%),radial-gradient(circle_at_87%_16%,rgba(251,191,36,0.09),transparent_28%)]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <header className="flex h-20 items-center justify-between border-b border-white/8">
          <div className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            <Activity className="size-4" aria-hidden="true" />
            Project Pulse
          </div>
          <a
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/10"
          >
            Sign in
            <ArrowRight className="size-4" aria-hidden="true" />
          </a>
        </header>

        <section className="grid min-h-[calc(100vh-5rem)] items-center gap-14 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(440px,0.82fr)] lg:py-20">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-sm uppercase tracking-[0.2em] text-amber-300">
              Attention, made visible
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
              Stop letting important work quietly disappear.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-400">
              Project Pulse separates work that needs attention from tasks that are moving forward—so you know where to act without maintaining another complicated system.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="/login"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-6 text-base font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Sign in to start
                <ArrowRight className="size-4" aria-hidden="true" />
              </a>
              <span className="inline-flex items-center justify-center gap-2 px-3 text-sm text-slate-500 sm:justify-start">
                <ShieldCheck className="size-4 text-emerald-300" aria-hidden="true" />
                Your tasks stay private to your account
              </span>
            </div>
          </div>

          <div className="relative" aria-label="Example Project Pulse dashboard">
            <div className="absolute -inset-10 bg-cyan-300/5 blur-3xl" aria-hidden="true" />
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1626]/95 shadow-[0_35px_100px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Today&apos;s pulse</p>
                  <p className="mt-1 text-xl font-semibold text-white">What needs attention?</p>
                </div>
                <div className="size-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]" aria-hidden="true" />
              </div>

              <div className="grid grid-cols-3 gap-px bg-white/8">
                {[
                  { label: "Attention", value: "1", Icon: Clock3, color: "text-amber-300" },
                  { label: "In motion", value: "4", Icon: CircleDot, color: "text-cyan-300" },
                  { label: "Done", value: "7", Icon: CheckCircle2, color: "text-emerald-300" },
                ].map(({ label, value, Icon, color }) => (
                  <div key={label} className="bg-[#0d1626] px-4 py-5 sm:px-5">
                    <Icon className={`size-4 ${color}`} aria-hidden="true" />
                    <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
                    <p className="mt-1 text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 p-5 sm:p-6">
                {exampleTasks.map((task) => (
                  <article
                    key={task.title}
                    className={`rounded-xl border border-white/8 border-l-4 ${task.tone === "amber" ? "border-l-amber-400" : task.tone === "cyan" ? "border-l-cyan-400" : "border-l-emerald-400"} bg-white/[0.035] p-4`}
                  >
                    <h2 className="text-sm font-semibold text-white">{task.title}</h2>
                    <p className={`mt-2 text-xs ${task.tone === "amber" ? "text-amber-300" : task.tone === "cyan" ? "text-cyan-300" : "text-emerald-300"}`}>
                      {task.detail}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
