---
name: change
description: Request a change to a product Pumori already built (or onboarded) - the PM turns it into new or changed requirements and journeys, the Designer mocks any new screens, the Architect adds tasks, and the normal build/QA loop runs. Use for "change X", "add feature Y", "fix Z" on a Pumori project after v1.
argument-hint: "<change request text or path>"
---

You are the orchestrator for a change request. Everything in `/pumori:factory` applies (preflight, sessions
mode with visible desks, autopilot, the build loop, QA, release); this skill only adds the front part.

1. **Preflight** as in `/pumori:factory` (clean `main`, `pumori status` works). In sessions mode, reuse the
   desks in `pumori roster` if they still exist; otherwise open the ones this change needs (this turn was
   typed by the human, so you may).
2. Save the request to `.pumori/changes/CR-<n>.md` (next free number). **Budget:** if the request or the human
   gives a cap, set `limits.budget_units` now (`pumori commit-docs -m "chore: budget"`). Don't ask again mid-run. Name this session
   `Pumori: <project> · CR-<n>` (as in the factory preflight).
3. **Size it** (say it in one line): **small** = a bug fix or a tweak to existing behaviour (≤ 3 REQs
   touched, no new screen); **feature** = new behaviour or a new screen.
4. **PM** (`pumori:pm`): "Mode: spec — change request `.pumori/changes/CR-<n>.md`. Add or modify REQs (keep
   ids stable, new ids continue the sequence, mark changed ones `(changed in CR-<n>)`), update nfr/threat
   model if affected, and add or update hidden journeys for the changed behaviour. Do not rewrite unrelated
   parts. Small change: no spec challenge, at most 1 new journey."
   For a feature, run the spec challenge as in the factory (lane M/L), clarify-only.
5. Show the human the REQ diff (`git diff -- .pumori/spec`) in ≤ 15 lines and ask for approval (autopilot:
   approve). On approval: `pumori commit-docs -m "spec: CR-<n>"`.
6. **Design and plan in parallel** (feature with a new or reworked screen): `pumori:designer` "Mode:
   mockups for CR-<n>: only the new/changed screens, reuse the existing shell and patterns; ~5 min, ≤ 6
   screenshots; update chosen.md" and, at the same time, `pumori:architect` "Mode: change for CR-<n>".
   Small change or no UI: Architect only. The Architect adds a new milestone with `pumori add-tasks`
   (contract task first when a shared schema changes), then `pumori validate-plan`.
   **Test migration:** the Architect lists the protected tests each task breaks (`amends_tests` +
   `amend_reason`), and that task updates them, approved by the Reviewer. No separate amendment rounds.
   **Coarse tasks for changes:** one task per screen or feature, not slices. Usually 3–8 tasks for a change
   request; up to ~15 files / ~900 changed lines each is fine. Each task brings a few tests for its behaviour, not a
   test per detail (styling and layout are checked by QA's screenshots, not unit tests). For a parity screen, one task
   ports the reference code (see the Architect's parity rule).
7. `pumori commit-docs -m "plan: CR-<n>"`, `pumori stage build`, and continue with the `/pumori:factory`
   build loop (rolling build: one build-wave run usually builds the whole change).
8. **Lean QA for changes:** one QA pass that covers:
   - the changed REQs;
   - paired screenshots against the reference for parity screens;
   - a 5-minute regression pass of the main flow;
   - **only the journeys that require a changed REQ** (pass that subset as `journeys`). Don't re-judge the whole set.

   A second cycle retests only the fixed bugs. Show the human the screenshots (UI look checkpoint) as soon as QA
   has them.
9. Release: `pumori release`, with a new `HANDOFF.md` section for CR-<n>.
