import { env } from "cloudflare:workers";

type AuthEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
};

export async function GET() {
  const runtime = env as unknown as AuthEnvironment;
  if (!runtime.SUPABASE_URL || !runtime.SUPABASE_PUBLISHABLE_KEY) {
    return Response.json(
      { error: "Authentication is not configured." },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  return Response.json(
    {
      url: runtime.SUPABASE_URL,
      publishableKey: runtime.SUPABASE_PUBLISHABLE_KEY,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
