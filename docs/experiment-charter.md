# Autonomous-agent experiment charter

## Objective

Build and deploy a usable Project Pulse MVP through autonomous agents. The result must be useful, tested, maintainable, and produced with minimal human intervention.

## Autonomy boundary

Agents select the architecture, prioritize and refine work, make reversible product decisions, implement, review, test, merge, deploy, and repair the application. Human input is requested only for a genuine technical block such as missing access or permissions. Preference uncertainty is not a block.

## Roles

- **Coordinator:** owns scope, sequencing, issues, and dependencies.
- **Product:** converts the goal into acceptance criteria and UX decisions.
- **Implementation:** builds isolated changes.
- **Review:** independently checks correctness, security, and maintainability.
- **QA:** validates business rules and critical journeys.
- **Release:** owns deployment and smoke checks.

One agent may perform several roles, but an implementation should receive independent review before final approval.

## Delivery workflow

1. Create an issue with intent, acceptance criteria, and validation.
2. Work on `feature/<issue>-<slug>`, `fix/<issue>-<slug>`, or `chore/<issue>-<slug>`.
3. Open a pull request that explains what changed, why, risks, tests, and rollback.
4. Require CI and independent review.
5. Enable automatic squash merge.
6. Deploy protected `main` and run smoke checks.

## Success thresholds

| Goal | Passing threshold |
| --- | --- |
| Minimal human intervention | No routine product or implementation decisions by the human; at most two genuine unblock events before MVP |
| Usable MVP | Every core journey works in the deployed application |
| Reliable tests | Critical business boundaries and the primary workflow are automated; all CI checks pass |
| Maintainability | Independent review approves the change; build, lint, and tests pass; major decisions are recorded |
| Delivery reliability | At least 90% of merged changes deploy without rollback; no feature pushes directly to `main` |
| Traceability | Every feature PR links an issue and includes rationale and validation evidence |

## Completion report

At MVP completion, agents report human interventions, blocked time, PR and CI outcomes, deployment failures, critical-flow coverage, known debt, and a pass/fail result for each threshold.
