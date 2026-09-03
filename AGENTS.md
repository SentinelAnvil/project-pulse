# Project Pulse agent instructions

## Operating model

- Work autonomously. Ask the human only when a technical dependency, permission, or unavailable external decision blocks progress.
- Choose reversible defaults when requirements are ambiguous and record the reasoning.
- Every feature begins with a GitHub issue and is delivered through a short-lived branch and pull request.
- Enable automatic squash merging only after required checks and independent review pass.
- Do not push feature work directly to `main`.

## Quality boundary

- Keep time-based task categorization isolated from rendering and storage.
- Add or update tests whenever a business rule changes.
- Never store `isNeglected`; derive it from task status, due date, and `lastTouchedAt`.
- Never commit secrets or generated runtime data.
- Record meaningful decisions in `docs/decisions/` and human interventions in `docs/experiment-log.md`.
