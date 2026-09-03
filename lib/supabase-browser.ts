"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabaseBrowserClient(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = fetch("/api/auth/config", { cache: "no-store" })
      .then(async (response) => {
        const config = (await response.json()) as {
          url?: string;
          publishableKey?: string;
          error?: string;
        };
        if (!response.ok || !config.url || !config.publishableKey) {
          throw new Error(config.error || "Authentication is unavailable.");
        }

        return createClient(config.url, config.publishableKey, {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
          },
        });
      })
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }

  return clientPromise;
}
