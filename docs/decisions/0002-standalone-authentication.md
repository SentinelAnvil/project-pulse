# ADR 0002: Use Supabase identity with server-verified bearer tokens

## Status

Accepted — 2026-09-03

## Decision

Move the standalone application to Cloudflare Workers and a separately owned D1 database. Use Supabase passwordless email authentication for account creation and browser sessions.

The browser sends the Supabase access token with every task request. The Worker validates that token with Supabase before reading or writing D1, and uses the verified Supabase user ID as the task owner key.

## Why

The public homepage and login experience must work independently of ChatGPT. Delegating email verification, session renewal, and account recovery to an identity provider avoids implementing sensitive password infrastructure while allowing Project Pulse to own the login interface.

Authorization remains in the Worker rather than relying on the dashboard UI. This means direct API requests cannot access tasks without a valid identity, and every D1 query continues to enforce user ownership.

## Consequences

- The existing ChatGPT-hosted release remains available as a rollback target but is no longer the primary deployment.
- The standalone database starts empty, as requested.
- Task requests perform an identity verification request before reaching D1.
- The Supabase publishable key is intentionally available to the browser; privileged Supabase keys are never used by the application.
- Production deployment requires Cloudflare and Supabase values stored as GitHub Actions secrets.
