# Experiment log

## 2026-09-03 — Experiment initialized

- Human supplied the product premise and selected the autonomy boundary: no approval unless technically blocked.
- Human selected success criteria: usable deployed MVP, maintainable tested code, and minimal intervention.
- Human selected feature branches with automatic merging.
- Product and experiment-protocol agents independently defined the MVP and delivery charter.
- Coordinator selected a single-page Vinext/React application with D1 persistence.
- No human implementation or product decision was requested.

Human intervention count: **0**

## 2026-09-03 — GitHub delivery infrastructure unblocked

- GitHub auto-merge required repository visibility and a protected-branch ruleset that were outside agent permissions.
- Human made the repository public and enabled the requested auto-merge protection.
- Agents resumed the workflow, queued automatic merge, and deployed only after the required check passed.

Human intervention count: **1**

## 2026-09-03 — Standalone identity infrastructure supplied

- The first MVP used platform-provided ChatGPT identity because it required no separate credentials.
- Human requested an independent sign-in and supplied the externally owned Cloudflare and Supabase projects through GitHub Actions secrets.
- Human created the new D1 database because account creation and credential issuance are outside agent authority.
- Agents own the authentication migration, tests, repository delivery, database migration, and deployment.

Human intervention count: **2**

## 2026-09-03 — Independent review cycle

- QA and code-review agents rejected the first implementation because task ownership, runtime validation, live time transitions, modal error feedback, and primary-flow integration tests were insufficient.
- The implementation agent added ChatGPT authentication, owner-scoped D1 queries, strict date and payload validation, minute/visibility refresh, announced feedback, and idempotent state transitions.
- A second review rejected release because pure domain tests did not protect the API persistence and ownership boundary.
- An authenticated Miniflare/D1 integration test now exercises unauthorized access, malformed input, two-user isolation, create, reload, edit, touch, complete, conflict handling, reopen, and delete.
- Final local result: lint passed, production build passed, and 10 automated tests passed.

Human intervention count during the review cycle: **0**
