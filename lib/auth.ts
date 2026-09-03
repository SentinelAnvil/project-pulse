import { env } from "cloudflare:workers";

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
};

type AuthEnvironment = {
  SUPABASE_URL?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  AUTH_TEST_SECRET?: string;
};

function authEnvironment(): AuthEnvironment {
  return env as unknown as AuthEnvironment;
}

export async function getCurrentUser(request: Request): Promise<AuthenticatedUser | null> {
  const runtime = authEnvironment();

  if (
    runtime.AUTH_TEST_SECRET &&
    request.headers.get("x-auth-test-secret") === runtime.AUTH_TEST_SECRET
  ) {
    const id = request.headers.get("x-auth-test-user-id");
    const email = request.headers.get("x-auth-test-user-email");
    if (id && email) return { id, email, displayName: email };
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;

  const token = authorization.slice("Bearer ".length).trim();
  if (!token || !runtime.SUPABASE_URL || !runtime.SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch(`${runtime.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: runtime.SUPABASE_PUBLISHABLE_KEY,
        authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const user = (await response.json()) as {
    id?: unknown;
    email?: unknown;
    user_metadata?: { full_name?: unknown; name?: unknown };
  };
  if (typeof user.id !== "string" || typeof user.email !== "string") return null;

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : null;

  return {
    id: user.id,
    email: user.email,
    displayName: metadataName || user.email,
  };
}
