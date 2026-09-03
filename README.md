# Project Pulse

Project Pulse is a focused productivity app that makes neglected work visible. It separates tasks that need attention from healthy active work and completed progress.

The public homepage explains the product. The private dashboard requires ChatGPT sign-in, and task records are isolated by the authenticated user ID.

## MVP

- Create and edit tasks with optional notes and due dates.
- Surface active tasks as neglected when overdue or untouched for seven full days.
- Record renewed attention with **Worked on it**.
- Complete, reopen, and delete tasks.
- Persist all task data in Cloudflare D1.

## Development

```bash
npm ci
npm run db:generate
npm test
```

The application is built with TypeScript, React, Vinext, Drizzle, and Cloudflare D1. Deployment configuration lives in `.openai/hosting.json`.

## Agent experiment

This repository is also an experiment in autonomous software delivery. Humans define the outcome and unblock genuine technical constraints; agents own product decisions, implementation, review, testing, merging, deployment, and the final evaluation. See [the experiment charter](docs/experiment-charter.md).
