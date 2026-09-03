"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { PulseDashboard } from "@/components/pulse-dashboard";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type AuthState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; user: User; accessToken: string };

export function AuthGate() {
  const [auth, setAuth] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};

    getSupabaseBrowserClient()
      .then(async (client) => {
        const { data, error } = await client.auth.getSession();
        if (!active) return;
        if (error) {
          setAuth({ status: "error", message: "Your session could not be checked." });
          return;
        }
        if (!data.session) {
          window.location.replace("/login?next=%2Fdashboard");
          return;
        }

        setAuth({
          status: "ready",
          user: data.session.user,
          accessToken: data.session.access_token,
        });

        const listener = client.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          if (!session) {
            window.location.replace("/");
            return;
          }
          setAuth({
            status: "ready",
            user: session.user,
            accessToken: session.access_token,
          });
        });
        unsubscribe = () => listener.data.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) {
          setAuth({ status: "error", message: "Authentication is temporarily unavailable." });
        }
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  async function signOut() {
    const client = await getSupabaseBrowserClient();
    await client.auth.signOut();
    window.location.replace("/");
  }

  if (auth.status === "ready") {
    const name =
      (typeof auth.user.user_metadata?.full_name === "string" &&
        auth.user.user_metadata.full_name) ||
      auth.user.email ||
      "Project Pulse user";
    return (
      <PulseDashboard
        userName={name}
        accessToken={auth.accessToken}
        onSignOut={() => void signOut()}
      />
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#070c16] px-5 text-slate-100">
      <div className="text-center">
        <Activity className="mx-auto size-8 animate-pulse text-cyan-300" aria-hidden="true" />
        <p className="mt-4 text-base text-slate-300">
          {auth.status === "error" ? auth.message : "Checking your session…"}
        </p>
        {auth.status === "error" && (
          <a href="/login" className="mt-5 inline-block text-sm font-semibold text-cyan-300 underline underline-offset-4">
            Return to sign in
          </a>
        )}
      </div>
    </main>
  );
}
