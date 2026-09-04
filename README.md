# Project Pulse

Project Pulse is a focused productivity app that makes neglected work visible. It separates tasks that need attention from healthy active work and completed progress.

The public homepage explains the product. The private dashboard and weekly calendar use passwordless email authentication through Supabase, and all records are isolated by the authenticated user ID.

## MVP

- Create and edit tasks with optional notes and due dates.
- Surface active tasks as neglected when overdue or untouched for seven full days.
- Record renewed attention with **Worked on it**.
- Complete, reopen, and delete tasks.
- Persist all task data in Cloudflare D1.
- Maintain recurring weekly blocks across fixed, protected, focus, flexible, and routine time.
- Validate and preview a versioned Project Pulse JSON schedule before importing it.

## Development

```bash
npm ci
npm run db:generate
npm test
```

The application is built with TypeScript, React, Vinext, Supabase Auth, Drizzle, Cloudflare Workers, and Cloudflare D1.

Production is deployed automatically after the required GitHub verification job succeeds on `main`. The deployment workflow applies D1 migrations before publishing the Worker.

The JSON import format is documented by [the version 1 schema](docs/project-pulse-schedule-v1.schema.json). Imports merge with the existing weekly calendar and skip exact duplicates; they never replace existing blocks.

## Agent experiment

This repository is also an experiment in autonomous software delivery. Humans define the outcome and unblock genuine technical constraints; agents own product decisions, implementation, review, testing, merging, deployment, and the final evaluation. See [the experiment charter](docs/experiment-charter.md).
