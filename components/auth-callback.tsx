"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function AuthCallback() {
  const [error, setError] = useState(false);

  useEffect(() => {
    getSupabaseBrowserClient()
      .then(async (client) => {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        }
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError || !data.session) throw sessionError || new Error("No session");
        window.location.replace("/dashboard");
      })
      .catch(() => setError(true));
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-[#070c16] px-5 text-slate-100">
      <div className="text-center">
        <Activity className="mx-auto size-8 animate-pulse text-cyan-300" aria-hidden="true" />
        <h1 className="mt-5 text-xl font-semibold text-white">
          {error ? "This sign-in link could not be used" : "Signing you in…"}
        </h1>
        {error && (
          <a href="/login" className="mt-4 inline-block text-sm font-semibold text-cyan-300 underline underline-offset-4">
            Request a new sign-in link
          </a>
        )}
      </div>
    </main>
  );
}
