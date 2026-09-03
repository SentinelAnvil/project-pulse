"use client";

import { FormEvent, useEffect, useState } from "react";
import { Activity, ArrowLeft, Mail } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getSupabaseBrowserClient()
      .then((client) => client.auth.getSession())
      .then(({ data }) => {
        if (data.session) window.location.replace("/dashboard");
      })
      .catch(() => setError("Authentication is temporarily unavailable."));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const client = await getSupabaseBrowserClient();
      const { error: signInError } = await client.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signInError) throw signInError;
      setSent(true);
    } catch {
      setError("The sign-in email could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#070c16] px-5 py-12 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_38%),radial-gradient(circle_at_85%_85%,rgba(251,191,36,0.06),transparent_28%)]" aria-hidden="true" />
      <div className="relative w-full max-w-md">
        {/* A plain navigation keeps authentication independent of client routing state. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm text-slate-400 transition hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to Project Pulse
        </a>
        <section className="rounded-3xl border border-white/10 bg-[#0d1626]/95 p-6 shadow-[0_35px_100px_rgba(0,0,0,0.45)] sm:p-8">
          <div className="flex size-11 items-center justify-center rounded-xl bg-cyan-300/10 text-cyan-300">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
            {sent ? "Check your inbox" : "Sign in to your dashboard"}
          </h1>
          <p className="mt-3 text-base leading-7 text-slate-400">
            {sent
              ? `We sent a secure sign-in link to ${email}.`
              : "Enter your email and we’ll send you a secure sign-in link. No password needed."}
          </p>

          {sent ? (
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-7 min-h-11 text-sm font-semibold text-cyan-300 underline underline-offset-4"
            >
              Use a different email
            </button>
          ) : (
            <form onSubmit={submit} className="mt-7">
              <label htmlFor="email" className="text-sm font-medium text-slate-200">
                Email address
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/15"
                />
              </div>
              {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
              <button
                type="submit"
                disabled={busy}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-cyan-300 px-5 text-base font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "Sending…" : "Email me a sign-in link"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
