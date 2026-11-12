---
name: onboard
description: Prepare an existing repository for the Pumori team - profile it, create ./verify, init.sh, .pumori/stack.json and AGENTS.md, and record a baseline - so /pumori:factory or /pumori:change can work on it. Use when the user wants Pumori to work on an existing codebase.
argument-hint: "[path to a PRD or change request]"
---

Onboard the current repository (the session must be rooted at the repo).

1. Confirm with the user that Pumori may create files in this repo (`verify`, `init.sh`, `.pumori/`,
   `AGENTS.md`/`docs/conventions.md`) and commit them on a new branch `pumori/onboarding`. Never on a repo
   the user said is read-only. Create and switch to that branch only after they agree.
2. `pumori adopt`.
3. Spawn `pumori:onboarder`. When it returns, show the user the commands it found, the baseline
   (`.pumori/baseline.md`) and anything blocking.
4. If `$ARGUMENTS` has a PRD or change request, copy it to `.pumori/prd.md`, commit with
   `pumori commit-docs -m "chore: prd"`, and tell the user to run `/pumori:factory` (new features) or
   `/pumori:change` (a change to existing behaviour).

Note for the user: on existing codebases the team works on the onboarding branch's `main`-equivalent;
merging into their real main stays a human decision.
