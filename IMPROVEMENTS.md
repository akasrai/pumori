# Pumori improvement log

Findings from real runs. Fix, then re-run the benchmark to confirm.

## 0.7.0 (2026-11-12): public release, neutral look, brands

- **Neutral default look.** The template's colours moved to one file, `apps/web/app/theme.css`: neutral surfaces, hairline
  borders, one indigo accent (`#4f46e5`, `#818cf8` in dark), standard status and chart colours. The default font is
  Geist (OFL), self-hosted in `apps/web/app/fonts/` and exported as `fontSans` (`--font-brand-sans`).
- **Brands.** `pumori brand list`, `pumori brand apply <name|path>`, and `pumori new ... --brand <name>`. A brand is a
  folder in `~/pumori-home/brands/<name>/` (`brand.json`, `theme.css`, optional `fonts/` and `logo.svg`); the stack's
  `brand_targets` say where each part goes. Brands live outside the repo.
- **The PM asks about the look** when no brand is set (default, match an existing product, or brand colours, font and
  logo); the Designer applies the answer to the theme in design mode, before any build task.
- **Public repo:** company-specific wording removed, MIT license, README with requirements, install, brands and cost.
- Checked on a fresh project: full `./verify` passes with the default look and with a saved brand applied.

## From P1 run v01 (2026-11-06)

| # | Finding | Status |
|---|---|---|
| 1 | Staging web port (WEB+1000) equalled the dev API port: the API and web port ranges overlapped by exactly 1000 | **Fixed** in `pumori new` (API now uses 4600–4999) |
| 2 | Protected *template* tests (auth e2e/unit) lock the scaffold's UI text, so the design can't restyle auth pages | Open: add a `supersedes_tests` task field, where the Test Designer rewrites a baseline test, the reviewer must approve it, and the CLI moves protection to the new file |
| 3 | The red check rejects polish-only tasks (nothing new to fail), so the Architect folded polish into feature tasks | Open: document the existing `allow_green` task flag in the Architect prompt (require a reason; reviewer checks it) |
| 4 | Tests written before code can't import new components, so web behaviour is only tested via e2e (slower) | Accepted for now; consider letting the Test Designer add a component stub contract |
| 5 | The spec challenge used parallel critics: the run reported "no team tools are available in this session" even with the flag on, because agent teams aren't available in app-started sessions | **Replaced** by sessions mode: role desks nested under the run, talking via SendMessage (probe 2026-11-06: start, both message directions and the shared folder all worked) |
| 6 | A session that another session started can't start sessions itself (the auto-mode check refuses it) | By design: sessions mode needs the human to type `/pumori:factory`; otherwise Pumori falls back to agents mode |
| 7 | The P1 run paused when a workflow approval card went unanswered | Document: click **Always** on the first workflow approval, or add `Workflow` to allow rules |
| 8 | T3's protected e2e test was itself wrong: it could never pass because Playwright evaluated a string, not a function. The developer couldn't edit it (correct), 3 rounds failed, and the conductor said "replan". The **architect then fixed the protected test directly on main**, unreviewed. Good diagnosis, but a governance gap: only the Test Designer should change protected tests | Open: block protected-test edits for every role except `pumori:test-designer`; add `pumori amend-test <task> --reason`, which requires a reviewer verdict on the test diff and logs it. Conductor/architect then request an amendment instead of editing |
| 9 | Test Designers produced a test that typechecked and failed for the wrong reason (it could never pass), and the red check accepted it | Open: after the red check, run a "could this pass?" sanity review of each test by the reviewer (read-only), or have the Test Designer prove each test against a tiny throwaway implementation |
| 10 | M1 QA listed 8 REQs as "failed" only because their UI is planned for M2: an API task in M1 cited them, so they were in M1's criteria. This creates noise and risks duplicate fix tasks | Open: `pumori next` should give QA, for each REQ, the tasks still pending in later milestones, and QA should mark those `deferred`, not failed. The architect's triage should reject duplicates of planned tasks |
| 11 | The v02 run chose agents mode on its own because autopilot looked "unattended", so no desks opened | **Fixed** in the factory skill: autopilot doesn't change the mode; added how to switch a running agents-mode run to sessions mode midway |

## From P1 run v02, sessions mode (2026-11-06)

Result: 4/4 journeys, 13/13 tasks, 20 rounds, **43.3M units** (v01: 23.3M), about 5h50m wall clock (it ran alongside v01).

| # | Finding | Status |
|---|---|---|
| 12 | Only the T1 developer desk opened. The app refuses session starts on turns triggered by a workflow finishing (not by the human), so the run fell back to background developers | Open: start a **pool of 2–3 developer desks at setup** (during the human's turn), each with its own worktree; the orchestrator assigns tasks to free desks via SendMessage, and each desk branches `pumori-<task>` from main for every task |
| 13 | Scope creep: about 35 REQs again, plus a rate-limit/real-IP server task (T12) the PRD never asked for; 377 unit + 249 browser tests for a to-do app | Open: REQ budget scaled to PRD size; spec challenge may only clarify, never add features; NFRs default to "reasonable" for small PRDs; **lite mode** |
| 14 | The "string evaluate" test bug from v01 recurred (T3 and T9 escalations, ~30 min each): v01's lessons hadn't reached the global lessons file yet | Open: Test Designer checklist (never pass functions as strings to `evaluate`); Release writes global lessons at **each milestone close**, not only at the end |
| 15 | The release agent **started Docker Desktop by itself** | Open: release must ask (or report) instead of starting system apps |
| 16 | Desks worked: 4 desks, 27 cross-session messages, the spec debate and QA→Architect triage ran through them | Keep |

## Baseline comparison on P1 (2026-11-06)

| Run | Build time | Units | Journeys | Tests written |
|---|---|---|---|---|
| Plain single session (same template, PRD, answers) | **~3–4 min** | **2.1M** (including scoring) | **4/4** | 29 cases |
| Pumori v01 (agents mode) | ~2h of work (+10h idle at an approval card) | 23.3M | 4/4 | 238 |
| Pumori v02 (sessions mode) | ~5h50m | 43.3M | 4/4 | 626 |

Conclusions:
- On a small PRD the team process adds 10–20× cost and ~30–80× time **with no measurable quality gain**.
- The golden-path template (auth, conventions, `./verify`, per-checkout DBs) did most of the heavy lifting for the plain session too. The environment matters more than the org chart (matches research 06/08).
- P1's journeys don't discriminate enough. Pumori's value has to be proven on bigger PRDs (P3), where single sessions are expected to fail.
- Caveat: the baseline briefly read the v01 friction note (minor contamination).

| # | Finding | Status |
|---|---|---|
| 17 | Pumori needs **adaptive lanes**: small PRD → one developer session builds directly, then one QA + judges pass (the "fast lane"); the full team only for big PRDs, or when the fast lane fails its journeys | Open (top priority) |
| 18 | Benchmarks need harder hidden journeys (concurrency, money rounding, multi-user, persistence edge cases), so they separate good from merely working | Open |

## Fix round 1 (2026-11-06): what changed

| # | Fix |
|---|---|
| 2, 16 | `pumori amend-test baseline`: the Test Designer edits a template test, the reviewer approves that exact diff (`record test-review`), and the CLI commits it and moves protection |
| 3, 17 | `allow_green` now needs a `green_reason` (enforced by validate-plan and commit-tests) |
| 7 | Orchestrator reminds you to choose **Always** on the first workflow card. The suggested allow rules (`Workflow(pumori:…)`) were blocked from self-editing, so you add them yourself (see README) |
| 8, 19 | Hook: only `pumori:test-designer` may edit protected tests; `amend-test` is the reviewed path; the conductor's "replan" keeps the branch; `pumori resolve <task> retry|drop` clears escalations |
| 9, 14, 15 | Test Designer checklist ("could this ever pass?", the evaluate trap, web-first assertions); trap documented in the template's AGENTS.md; conductor and architect write lessons to the global file immediately; global lessons curated |
| 10 | `pumori next` gives QA `criteria` (fully built REQs) and `deferred` (REQs still being built); QA ignores deferred |
| 11 | Workflows reject bad arguments with a clear error; write-tests results schema made strict |
| 12 | `validate-plan` ignores requirements marked removed or struck through |
| 13 | QA boots a production build via `pumori boot` (`qa_boot: ./init.sh --prod`); `@axe-core/playwright` added to the template |
| 4, 5, 6, 13 (A) | **Adaptive lanes** (`pumori lane`): S/M/L with budgets for requirements, milestones, tasks, tests per task, questions, design variants and challenge. Lane S skips the challenge and design and plans 1 milestone of 2–5 tasks. `pumori check-spec` enforces the requirement budget. Browser tests run once per milestone (`pumori milestone-check`, which reopens the failing task) instead of at every merge |
| 20 | Hook blocks `open -a`, `osascript`, `launchctl`, `brew services/install`, `sudo`, and Postgres config edits; release reports Docker missing instead of starting it |
| 21 | Hook: Pumori's own source is read-only from inside a project run |
| 22 | Sessions mode opens a **developer desk pool** in the human's first turn and reuses it for every task |
| 23 | Agent-teams branch removed; sessions mode covers it |
| 24 | QA timeline entries now show the verdict and bug counts |
| 25 | Hook: the PM can't read hidden journeys when `fixed_journeys` is on |
| 18 | Still open: harder benchmark journeys |

## Fix round 2 (2026-11-06): parallel specialists, one Dev lead desk, git

| Change | Why |
|---|---|
| Pumori is now a local git repo (baseline commit `3b7743b`) | Every change is reviewable and can be undone |
| `pumori:backend-dev` and `pumori:frontend-dev` specialists plus the generalist `pumori:developer` (contract/fullstack); hook fences each specialist to its stack area | You asked for separate backend/frontend developers working in parallel |
| Architect plans contract first (schemas, DB, component stubs), then backend ∥ frontend tasks, split further for big features | Lets specialists work at the same time without waiting on each other |
| `pumori next` writes tests per wave (once a task's deps are merged) and routes each task to its specialist (`dev_agent`, `area`); parallelism by lane S3/M4/L6 | Frontend tests can import the contract's stubs; more developers at once |
| Handoff and gate skip browser tests; the milestone check runs them on integrated main | A frontend task can finish before its backend twin |
| Sessions mode: one **Dev lead** desk runs the tests and build workflows; the developer pool was removed | Background developers need no new sessions, so the "only on your turn" limit no longer matters |

## P1 v03 result (lanes + specialists), 2026-11-06
37 min, 9.1M units, 4/4 journeys, 13 REQs, 4 tasks (contract → backend ∥ 2× frontend), 44 tests, 4 rounds.
Remaining time sinks: release ~6.5 min, separate test rounds ~4 min, a frontend task reopened by the browser
check ~4.5 min, and hand-offs between desks.

## Fix round 3 (2026-11-06): toward 20 min, harder journeys, team coding rules

| Change | Why |
|---|---|
| Tests and build in one per-task flow inside build-wave (Test Designer → red check → specialist); `pumori next` puts untested ready tasks straight into the wave (`needs_tests`); red checks run under the main-checkout lock | No task waits for the rest of the wave's tests (~3 min) |
| At a task's gate, its own browser tests run when every task sharing its REQs is already merged | Frontend/backend integration bugs go straight back to the developer, with no reopen later (~4 min) |
| Release is always a background agent; lane S gets a lite release | Saves ~5 min; no refused late desk |
| Lane S opens only the PM, Architect and Dev lead desks; the orchestrator runs QA itself | Fewer hand-offs |
| Harder hidden journeys: P1 SC-0005 (30-item list, order and counter), SC-0006 (two tabs, stale actions); P3 SC-0005 (cent-exact splits, settle-up), SC-0006 (single-use invite, membership privacy) | So benchmarks separate great from merely working |
| Team TypeScript rules: `docs/coding-rules.md` in the stack pack; ESLint enforces arrow functions, named exports, interfaces, no enums, no `&&` spreads, padding lines, quotes and semicolons; the reviewer checks the [review] rules; developers and test designers read them | The user's coding standards apply to frontend and backend |

## P1 v04 result, 2026-11-06
27.4 min, 7.3M units, **6/6 journeys** (including the 2 harder ones; all votes yes), 14 REQs, 4 tasks, 4
rounds (every task passed first time); the browser check passed first time; the code follows the team's
TypeScript rules.

## Fix round 4 (2026-11-07): leaner roster (13 agents)

| Change | Why |
|---|---|
| **Release is now `pumori release`** (CLI): final full verify, staging only if Docker is already running, `HANDOFF.md` generated from recorded state (tasks, REQ coverage, journeys, risky files by path, QA known gaps, cost), committed | Release was mechanical; the command takes ~30 s instead of ~3.5 min and can't invent facts |
| **Conductor folded into the Architect** (`unstick` mode; same `record conductor` decisions) | It rarely ran, and its decisions became Architect work anyway |
| **Planner agent for lane S**: spec and plan in one pass, checked by `check-spec` + `validate-plan` + its own architect-style re-read; lanes M/L keep PM and Architect separate | In v03/v04 the separate Architect found nothing in the spec; this matches Kiro, Spec Kit and Superpowers practice |
| **Judges on Haiku** (medium effort) | Reading evidence and voting is a cheap task |
| **QA desk back in every lane**; lane S desks: Planner, QA, Dev lead | You want to see QA as its own desk |
| **Tests written while the contract builds**: `pumori next` returns `prewrite` tasks; Test Designers write into `.pumori/runtime/prewrite/<task>/` (so unmerged references can't break the project type check); the red check moves them into place after the dependencies merge | Removes the test-writing wait after the contract (~3–4 min) |


## P3 comparison: Pumori v01 vs plain session (2026-11-07)

| | Plain session | Pumori |
|---|---|---|
| Hidden journeys (6, majority of 3 votes) | **2/6** | **6/6** (after 3 QA cycles on M3) |
| Build time | ~12 min | ~3h50m active + 7.5h waiting for a human decision |
| Units | 6.1M | 55.4M |
| Tasks / tests | — / 46 | 22 tasks, 3 milestones / 213 |
| Blind UI/UX review (3 judges) | lost | **won** (mobile/a11y high confidence; visual and usability low–medium) |

- Decisive bug: the PRD's dev "outbox" was built public in **both** apps, leaking invite links and emails (an outsider joined a private group). Pumori's QA → judges → triage loop found and fixed it (login-only, recipient-only outbox). The plain session shipped it.
- Design: the Designer build won the money screens (aligned share rows, balances first, specific live split errors, designed empty/settled states, no horizontal scroll at 390 px). The plain build won some flows (one-click settle-up from who-pays-whom, a fuller activity feed, "(you)" markers, sign-up-and-join invite page). Mockup fidelity was very high, but the designed invite-onboarding path got lost.

| # | Finding | Status |
|---|---|---|
| 19 | A spec-change decision waited 7.5 h for a human, overnight | Open: in autopilot, PM decides small spec fixes that a judge or security finding requires; otherwise notify clearly and keep building unaffected work |
| 20 | Lane M task cap (20) too low; the run switched itself to lane L | Open: separate fix-task allowance (+30%) on top of the planned cap |
| 21 | A reopened task under an already-closed milestone wasn't offered by `pumori next` | Open (CLI bug) |
| 22 | Main left with uncommitted tracked changes once, which blocked a merge | Open: amend/triage paths must commit or stash; `next` reports a dirty main |
| 23 | Several protected tests still needed amending (helpers, strict-mode locators broken by later tasks) | Open: add strict-mode/locator-scope traps to the checklist |
| 24 | Speed: 30 min before any code; ~45 min per milestone | Open: lane M time budget, design ≤ 1 variant unless the PRD is about looks, parallel 6 |
| 25 | Designer is strong on layout and states, weak on flows (lost the invite path; no settle shortcut) | Open: designer includes "flow shortcuts" (next action from each state); QA checks the designed flows exist |

## Production-readiness audit of Pumori's P3 app (2026-11-07)

Three read-only audits:
- **Security: not ready.**
- **Money and data: ready with fixes.** 20,000 random groups were property-tested with 0 money bugs.
- **Ops and code quality: ready with fixes.** A senior engineer would accept it as a maintainable base.

Most gaps belong to the **template (golden path)**, not to the generated feature code, so fixing them once there fixes every future app:

| # | Gap | Fix location |
|---|---|---|
| 26 | No rate limiting on login/signup; `trustProxy: true` | Template: `@fastify/rate-limit`, configurable proxy trust |
| 27 | No security headers (CSP, frame-ancestors, HSTS, nosniff, Referrer-Policy) | Template: `next.config` `headers()` + `@fastify/helmet` |
| 28 | `COOKIE_SECURE` not forced in production | Template: env refine |
| 29 | Request logs contain URL tokens | Template: pino `req` serializer that redacts token paths |
| 30 | Dev outbox / dev-only features live in production; no email verification | Template: dev-only route gate + mail transport interface; PM: flag dev stand-ins |
| 31 | No migration step at deploy; production images never built or run | Template: migrate entrypoint; `pumori release` builds the production images even without staging |
| 32 | No CI or README/runbook | Template: CI workflow (`./verify` + Postgres service), README skeleton |
| 33 | No error pages or error tracking; no timeouts; e2e only on `next dev` | Template: `error.tsx`/`global-error.tsx`/`not-found.tsx`, `instrumentation.ts` hook, fetch/DB/request timeouts, e2e on a production build |
| 34 | Sessions: no idle timeout or purge; scrypt at OWASP minimum | Template: session policy |
| 35 | Data layer: missing DB CHECKs, non-snapshot balance reads, re-invite race, no idempotency keys, no pagination | Coding rules + reviewer lens ("constraints in DB, not only zod; one snapshot for aggregates; idempotent creates") |
| 36 | Lean-spec rule cut security basics as non-goals (rate limiting, email verification) | Rule: production baseline security lives in the template and never counts against the requirement budget |

## Fix round 5 (2026-11-07): production-grade template, process fixes

| Item | Change |
|---|---|
| 26–34 | Template hardened:
- rate limits (global, plus auth per IP and per email);
- configurable `TRUST_PROXY`;
- helmet and Next security headers (CSP, frame-ancestors, HSTS in prod);
- Secure cookies enforced in prod;
- log redaction (token paths, query, cookie/authorization);
- `registerDevOnly` and a `Mailer` interface (dev outbox is login-only, recipient-only, 404 in prod);
- deploy-time migrate service;
- timeouts everywhere and `safeParse`;
- error, global-error and not-found pages, plus `reportError` hooks;
- session idle timeout, purge, scrypt N=2^17 with rehash;
- `/livez` and `/readyz`;
- CI workflow;
- README;
- `./verify --release` (e2e on a production build). |
| 35 | Data-safety [review] rules added to `docs/coding-rules.md` and to the reviewer's lens |
| 36 | PM rule: baseline security comes from the template; never a non-goal; not counted in `max_reqs` |
| — | Web app moved to `apps/web/app` (team convention) |
| 19 | Autopilot applies minimal spec changes forced by QA/judge/security findings; with a human, asks once and keeps building unaffected work |
| 20 | Triage tasks (`origin: fix`) don't count against the lane's planned-task cap |
| 21 | `pumori next` builds tasks reopened under closed milestones |
| 22 | `pumori next` blocks early, with the file list, when main has uncommitted tracked changes |
| 24 (part) | Reviewer runs `pumori gate` after APPROVE (one fewer hand-off per task) |
| — | Test pre-writing is opt-in (P3: 11 of 14 failed the red check vs 0 of 8); bench-score records process metrics |
| Not yet verified | Docker staging with the new migrate service (Docker wasn't running); the CI workflow on GitHub |

## Fix round 6 (2026-11-07): speed, from the P3 v02 time breakdown

P3 v02 (0.3.0) had used 251 active minutes when it was stopped before M3. Breakdown:
- rework loops ~65 min;
- QA and fix cycles ~75 min;
- spec, design and plan ~57 min;
- first-pass building only ~55 min.

Developers took 2–3 min per task; the time went around them. Its UI was the best so far, so the design
stage stays and gets faster.

| Cause in v02 | Cost | Change (0.4.0) |
|---|---|---|
| Uncommitted `.pumori/lessons.md` failed every gate at `main-clean`; the workflow charged it to developers (10 wasted rounds) | ~24 min | `pumori next` and `pumori gate` auto-commit the team's notes (`.pumori/`, `docs/`, `AGENTS.md`, `CLAUDE.md`) under the merge lock. Any other dirty file → gate fails with `environment: true` and the file list; build-wave retries the gate once and returns `env_blocked` instead of burning developer rounds |
| Expense sheet split across 3 parallel frontend tasks (T12 form, T13 split fields, T14 list): stubs vs real components broke tests after merge, amended twice | ~35 min | Architect rule: one screen/form/sheet = one frontend task; parts of a big screen are sequential |
| T12 needed a `ResizeObserver` stub (protected `setup.ts`) | (in the above) | Template `apps/web/test/setup.ts` stubs `ResizeObserver`, `matchMedia`, pointer capture and `scrollIntoView` |
| `getByLabel('Amount')` matched the "Exact amounts" radio | (in the above) | Lint rule in e2e: string `getByLabel`/`getByText`/`getByPlaceholder` need `{ exact: true }`; test-designer checklist updated (also: axe in each screen's own browser test) |
| T4 had to change the protected `vitest.config.ts` to add `WEB_ORIGIN` → NEEDS_HUMAN | ~5 min | New `apps/api/test-env.ts` (outside the protected test folder) is spread into the API test env |
| Each milestone waited for its own QA, fix wave and second QA (~40 min per milestone) | ~80 min | **Milestones overlap**: `pumori qa-mark start/end <m>`; while QA runs, `pumori next` returns the next milestone's build wave (note "overlaps QA"), or `wait`. A milestone QA has checked doesn't need a new browser check after later merges. Fix tasks come first |
| QA cycle 2 re-walked every criterion; criteria pass repeated what tests prove | ~20 min | Cycle 2+ is `Mode: retest` (the fixed bugs + a 3-minute smoke, no visual review); criteria pass time-boxed to ~12 min, focused on what tests miss |
| Designer: 22 min, 94 screenshots, then a 7-min apply step, then planning started | ~31 min on the critical path | Designer time box ~10 min, 3–4 key screens, ≤12 screenshots, writes `chosen.md` itself (apply only with 2+ directions). **Designer and Architect run in parallel**; the plan is shown at the approval checkpoint |

Expected (not measured yet): P3 in about 2–2.5 h active instead of ~5 h. Run P3 v03 to check.

## Hot-fix 0.4.1 (2026-11-07, during P3 v03)

| v03 problem | Cost | Fix |
|---|---|---|
| `pumori handoff T5` run with no input waited forever on an inherited stdin | 25 min | Commands that read JSON give up after 10 s with a usage hint |
| With milestones overlapping, `milestone-check M1` ran merged M2 tasks' browser tests, which need unbuilt M2 tasks; it reopened T14 and T16 although their code was merged | ~20 min | `milestone-check <m>` only runs tasks of `<m>` and earlier milestones |
| Test guard still flagged `playwright.config.ts` after a human had landed the same change on main | a few min | A runner-config change identical to main's content isn't counted |

Still to fix after v03:
- the template lacks WEB_ORIGIN (the public app URL), which v02 and v03 both had to add through protected files;
- the template's baseline e2e asserts placeholders the product is expected to change (nav "Overview", the login redirect);
- shared formatters belong in the contract task;
- a task reopened after its code was merged can't be re-reviewed: the review recorder needs the branch.

## P3 v03 result (0.4.0 + 0.4.1 hot-fix, 2026-11-07)

| | v01 (0.1.0) | v02 (0.3.0) | v03 (0.4.x) |
|---|---|---|---|
| Active minutes | ~211 | 251+ (stopped before M3) | 259 |
| Before building | 29 | 61 | 26 |
| Journeys | 6/6 | not reached | 6/6 |
| Tasks (incl. fixes) | 22 | 19 | 25 |
| Budget units | 55M | 49M+ | 66M |
| UI | plain | best so far | same quality as v02, plus the M2 design-review fixes |

Pumori's own bugs cost v03 ~75 min (stdin hang 25, overlap re-check 25, WEB_ORIGIN through protected files ~25 incl. 8 min human wait).
Quality loops from QA, design review and judges cost ~60 min (4 major design issues, the production invite-link gap SC-0001).
Without the Pumori bugs, v03 would be ~185 min.

Next (0.4.2):
- WEB_ORIGIN in the template;
- baseline e2e without product placeholders;
- the PM states how emailed links reach users in production;
- a spec change that alters a shared contract runs the contract task before any test amendment;
- shared formatters go in the contract task;
- the review recorder works on a re-gate without the old branch.
- drop a checkout's test DBs (`<db>_t_<id>`, `<db>_e_<id>`) when its worktree is removed, and add `pumori clean-dbs`. 135 leftover copies (1.1 GB) had piled up after 10 bench runs; dropped by hand on 2026-11-08;
- benchmark "active minutes" should exclude only waits on the human, not any 15-min gap: the v03 metric dropped the 24-min stdin hang and counted ~16 min of human waits.

## 0.4.2 (2026-11-08): fixes from the P3 v02/v03 analysis

| Change | Fixes (v03 cost) |
|---|---|
| Template: `WEB_ORIGIN` built in (env.ts default `http://localhost:$WEB_PORT`, required https in production; set for API tests, e2e servers and staging; documented in README/AGENTS) | T4 WEB_ORIGIN through protected files (~20 min + 8 min human wait), also in v02 |
| Template: baseline e2e check behaviour (login URL may carry `?next=`, any signed-in home path, any current nav item, email in the account menu) instead of placeholders | baseline amendment after the "Overview"→"Groups" rename (~11 min) |
| Runner configs change through `pumori amend-test config` (Test Designer + Reviewer); a hook stops developers editing them; the gate tells them so | human approval wait |
| `pumori resolve <task> merged` (runs the task's tests on main); review recorder explains a gone branch instead of crashing | T14/T16 re-gate loop |
| `pumori next --building`: while a build runs, other milestones can be checked and QA'd; `milestone-check` and `boot` hold the merge lock (re-entrant) so merges never change files under them | M3 QA waited ~70 min for M2's fix loop |
| PM: every emailed link/code must say how users get it in production | SC-0001 loop (~30 min), also v01 |
| Architect: code both sides use goes in the contract task; for a contract-changing spec change, contract task first, then test amendments | T9→T9b (~10 min), T21→T21a (~8 min) |
| `/pumori:change`: sizing (small/feature), Designer for new screens in parallel with the Architect, reuses or opens desks | change requests had no design step |
| DBs: test DBs dropped at the end of every test run (vitest teardown, Playwright globalTeardown); `testdb.ts sweep [--all]`; `pumori clean-dbs [--all]`; sweeps after a gate removes a worktree, at milestone close and (all) at release. Kept: app DB, `_tpl`, `_staging` if used | 135 leftover DBs (1.1 GB) |
| Metrics: time starts with the orchestrator; only `WAIT human:` events or gaps > 60 min count as waiting; long gaps listed | v03 metric dropped the 24-min hang and counted human waits |

Tested: fresh scaffold passes `./verify` and `./verify --release`; only `_tpl` remains after test runs; sweep drops orphans, keeps live checkouts' and non-test DBs; `next --building` / qa overlap simulated (5 cases); `resolve merged`; gone-branch review; milestone-check under the lock.

Estimate for P3 v04 (from the v03 timeline, not measured): ~150 min working time (range ~135–180 depending on what QA finds), against v03's ~267 and v01's ~211.

## 0.4.4–0.4.6 (2026-11-08): naming, budget fix, token split

- Sessions: orchestrator titles itself `Pumori: <project>`; desks are titled by role only (`PM`, `Designer`, `Architect`, `QA`, `Planner`, `Dev`).
- **Budget counter fixed:** it counted each reply several times (one reply is logged as several lines with the same message id). Real v03 usage was 33.9M units, not 66M; earlier runs were inflated ~2× too (comparisons between them still hold).
- v03 tokens by role (corrected):
  - orchestrator (Opus) 16%;
  - Test Designer 14%;
  - frontend devs 11%;
  - Dev lead desk (Opus, relay only) 10%;
  - QA 9%;
  - Reviewer (Opus) 8%;
  - Architect 7%;
  - other desks (Opus, relay) 10%.

  About 36% went to orchestration and relays on Opus.
- Desks start on Sonnet (role agents keep their own models).
- Risk-based reviews: Opus for contract/backend/full-stack tasks and frontend tasks whose files touch auth, sessions, permissions, proxying or config; Sonnet for other frontend work. On v03's plan: 14 Opus, 11 Sonnet.
- Suggested (user's choice): run the orchestrator session itself on Sonnet.

## Hot-fix 0.4.7 (2026-11-08, during the first real project): stop merge-failure loops

First real project, M1: main's login e2e became flaky (account menu clicked before hydration). Every merge then failed at
verify-after-merge, and T7/T8 were blamed 10 times (~35 min, ~3M units) until the orchestrator diagnosed it by hand.
- **Main-red check:** when a merge fails its tests, the gate re-runs the tests that should already pass on main (earlier
  tasks' and baseline; the task's own tests are red on main by design).
  - If main fails too, it records `main_red`; later gates are refused in under a second with stage `main-red`
    (`environment: true`).
  - Only a task marked `"fixes_main": true` is let through.
  - The block lifts when main's commit changes.
- **Circuit breaker:** 3 different tasks failing after merge within 15 min opens `circuit_open`, and later gates are refused
  with stage `circuit-open`. Any clean merge, or 15 minutes, closes it.
- build-wave returns `env_blocked` immediately for both stages (no developer rounds, no retry). The factory skill tells the
  orchestrator to have the Architect add one `fixes_main` task, then re-gate the blocked tasks.
- Tested on a scratch project:
  - a code break on main → `main-red` and instant refusals;
  - the fixes_main task merged, and the blocked tasks then passed;
  - 3 failing tasks → `circuit-open`.
- A cold-start flake on the first gate was correctly *not* flagged as main-red.
- Deferred until after the run: retry a failing e2e once and log it as flaky.

## Hot-fix 0.4.8 (2026-11-09, during the first real project): checks run in a clean checkout

Test designers write tests in the shared main checkout, several at once in wide waves, and `./verify` lints and type-checks
everything in that folder. One designer's unfinished draft therefore failed the other checks:
- 0.4.7's main-red check gave a false alarm at 25599653 (a `console.log` in T70's draft);
- red checks for T26/T68/T71/T73 were rejected;
- the earlier T20 "dirty main" block was probably the same thing.

Fix: gates, the main-red check, red checks and milestone checks run in a dedicated, gitignored worktree
`.claude/worktrees/pumori-verify`. It is reset to the exact commit under test each time (and `git clean`ed; ignored
node_modules and caches survive). Red checks copy in only that task's test files. Every caller holds the merge lock, so one
worktree is enough.

Tested on a scratch project, with a broken draft (lint + type error) left in the shared checkout:
- the red check passed;
- a good merge passed;
- no false main-red was raised.

A really broken committed main is still caught as `main-red`.

Still to do: test designers should draft in their own worktree too, so drafts never sit in main.

## 0.4.9 (2026-11-09, during the first real project): accept a milestone with known gaps

The human chose "Accept as known gaps" for M3: all criteria passed, but journeys SC-0001/SC-0004 were judged unsatisfied twice. Pumori had no command for that: `milestone-close` refused, and agents may not edit runtime state.
- New `pumori milestone-accept <m> --reason "..."`, for explicit human decisions only:
  - closes a built milestone and marks its ready journeys `accepted_gap`;
  - those journeys no longer block later closes (`blocking_journeys`), but are still re-run at later QA;
  - `HANDOFF.md` lists them under Known gaps.
- Root cause to fix later: `ready_journeys` marks a journey ready once any passed task cites each REQ. SC-0001/SC-0004 were therefore judged before their UI tasks existed. It should wait until every task citing those REQs has passed, as `qa_scope` does.
- Also after the run:
  - rolling scheduling and cross-milestone readiness (average parallelism was 1.8 against a cap of 6);
  - test designers drafting in their own worktree;
  - a flaky-e2e retry at the gate.

## 0.4.10 (2026-11-09): "don't wait on me" never means leaving the desks

At minute 299 the human wrote "keep doing all milestone without waiting on me". The orchestrator switched itself from
sessions mode to agents mode to avoid the app's held-message pause. The Dev and QA desks then sat idle for about 17 hours,
and the human lost the per-role view they had asked for.
- The factory skill now says: such instructions mean decide checkpoints and blocked questions with the recommended option
  (recorded in decisions.md) and keep going. Mode switches happen only when the human asks for them in words, or when a
  session start is refused.
- Later: when the app holds desk messages, tell the human in one line, so they can type `continue` (e.g. from their phone
  via Remote Control).

## First real project: retrospective (2026-11-08 → 11-09, Pumori 0.4.2 → 0.4.10)

**Size and outcome**
- ~28 h wall clock (~39 min of logged human waits, plus a 40-min app pause and a 75-min budget decision).
- 107 REQs, 6 milestones.
- **102 tasks: 62 planned + 40 fix tasks (+65%).** 103 merges.
- ~82.5K lines of TS (incl. 173 test files).
- **All milestone criteria pass.** Journeys **4/10** satisfied: M3–M6 were accepted with known gaps, by the human or under their standing approval.
- Budget ~170M real units (cap raised 150M → 200M). It took ~22 points of the weekly Ultra limit.
- **Release not run:** the Docker staging build hung for 30 min, the human stopped the release to test locally, and no HANDOFF.md was generated.

**Friction (counts from events)**
- 59 gate failures:
  - verify-after-merge 27;
  - main-red 15 (several false: WIP drafts before 0.4.8, and machine overload at load ~60 timing out e2e);
  - test-guard 10;
  - review 5;
  - main-clean 2.
- 13 protected-test amendments, 12 unsticks, 7 red-check rejections.
- Average parallelism 1.8 of a cap of 6.
- Merge checks grew from ~10 s to ~3 min.

**Fix next (priority order)**
1. **Scheduling:** rolling dispatch (start tasks as soon as their deps merge, not per wave) plus cross-milestone readiness.
2. **Journeys:** `ready_journeys` must wait until *every* task citing the REQs has passed (judged too early in M3/M4).
3. **Gate cost:** run only affected tests at the gate and the full suite at the milestone check. Limit concurrent e2e servers (resource-aware), because the overload caused false main-reds.
4. **Test designers draft in their own worktree** (0.4.8 isolates the checks only). Wrong protected tests (13): add a "could this pass against the contract/stubs" dry run before the red check.
5. **Right-size lane L:** 107 REQs led to +40 fix tasks. The PM's cap and challenge should push for fewer, sharper REQs, and the Designer's visual review should run per screen task, not only at QA.
6. **Release:** generate HANDOFF.md even when staging fails or is skipped, give staging a short timeout, and add `pumori handoff` to write it on demand.
7. **QA environment:** give each judge its own test account (shared-account noise affected several journeys).
8. Flaky-e2e retry at the gate (deferred from 0.4.7).

## 0.5.0 (2026-11-09): UI fidelity, from the human's review of the first real project

Every requirement passed, but the human rejected the UI. Problems they raised:
- dev links in the navigation;
- too compact compared with their product;
- the report and drafting pages not matching the existing report page (layout, tree labels, headings, score colours);
- the app menu on document pages;
- scrollbars everywhere.

Root cause: "exactly like the current report page" was treated as a design brief, not a parity requirement, and nobody showed the human the real screens until the end.

What changed:
- **Template:**
  - no developer links in `SHELL_NAV`;
  - new `FocusShell` (full screen, no app nav, back + mark + title + actions, tree pane and content pane scrolling on their own);
  - quiet global scrollbar style;
  - design guide: "matching an existing product comes first" (density, type, colour codes, scrollbars from the reference), plus "never" rules for needless scroll boxes and dev tools in the nav.
- **PM:** parity REQs for "exactly like X" screens (layout, nav labels, headings, fields, colour codes, interactions), plus an NFR to follow the reference product's density.
- **Designer:** port the reference code instead of redesigning; keep a parity checklist in chosen.md; visual review compares against the reference screenshots, and any unapproved difference is major.
- **QA:** paired screenshots (built vs reference); needless scrollbars and dev links count as bugs.
- **Architect:** for parity screens, one task ports the reference code first, and the other tasks build on it.
- **Factory:** a **UI look checkpoint**: after the first UI milestone and after each parity-screen milestone, show the human 4–8 screenshots (next to the reference) and ask "Does this look right?". If the human said not to wait, keep building and turn feedback into fix tasks.

Template checks pass (`./verify` on a fresh scaffold).

## 0.5.1 (2026-11-09): speed, aimed at doing CR-1 in about 2–2.5 h

The human expects a UI change request in about 2 h, as with a direct Claude session. Pumori's fixed costs made it ~5 h.
1. **Gate runs affected tests only:**
   - the task's own tests;
   - tests of passed tasks whose `files` this change touches;
   - baseline unit tests;
   - changed test files.

   A broad change (`packages/`, schema/env, `lib/`, package.json, lockfile, configs) still runs everything. The
   **milestone check runs the full unit/API suite once**; if it fails, it sets main-red, so the fixes_main flow
   handles it.
2. **Rolling scheduling:**
   - new `pumori ready <m> --exclude ...` lists the milestone's tasks whose deps have merged;
   - build-wave keeps `max_parallel` tasks busy and pulls newly unblocked tasks after every merge, so one workflow run usually builds the whole milestone;
   - `pumori next` passes `max_parallel` and `rolling: true`.
3. **Journeys are judged only when built:** a REQ counts as built only when **every** task citing it has passed.
4. **Change requests:** coarse tasks (one per screen or feature, 3–8 per CR), few behaviour tests (layout is checked by QA screenshots), one lean QA pass with paired reference screenshots, and only the journeys touching changed REQs.

Tested on a scratch project:
- `ready` lists T1, T2, then T2–T4 once T1 merges;
- T2's gate ran its own test + baseline only (10 s vs 22 s);
- SC-0001 stayed not-ready until T3 (second task citing REQ-1) passed;
- the milestone check ran the full suite first;
- the build-wave script parses.

Not exercised end to end with agents yet: CR-1 will be the measurement (target ≤ 2.5 h).
Still to do: cross-milestone readiness; capping concurrent e2e servers; test designers drafting in their own worktree.

## 0.5.2 (2026-11-09): FocusShell matches the drafting layout the human asked for
- **Header:** `logo` slot (the product's real logo), then the title with a `status` badge next to it; no account menu.
- **Optional fixed toolbar** under the header: tabs left (`toolbarStart`), all actions right on the same line (`toolbarEnd`).
- **Scrolling:** the window never scrolls; the tree pane and the content pane each scroll on their own. The design guide is updated.
- CR-1 §4a adds the matching drafting-page requirements (logo copied from the main app).

## 0.6.0 (2026-11-11): fixes from the CR-1/CR-2 analysis

CR-1 needed **9.7 active hours** against a 2.5 h target. The causes:
- 93 protected-test amendments, with main red in between;
- 21 main-red refusals;
- merge checks averaging ~150 s;
- an average of 1.1 developers at once;
- 4.3 h idle (11.8 h in CR-2).

Cost by role over the whole project (`pumori cost`): frontend-dev 19%, test-designer 17%, QA 16%, orchestrators
17%, reviewer 6%, architect 6%, judges 3%. The final app passes `./verify --release`.

**1. Change-friendly tests**
- `e2e/support/**` page helpers are never protected. Lint forbids `expect` in helpers, and the reviewer checks their diffs.
- A task may list `amends_tests` + `amend_reason`:
  - only those protected tests may change in its branch (hook and test guard);
  - the reviewer must record `tests_ok: true`, or the gate refuses;
  - `validate-plan` checks the files are protected tests.
- The Architect writes an impact list for each change request. The Test Designer uses helpers and asserts behaviour, not layout.

**2. Faster merge checks**
- `./verify --tests` accepts changed source files and runs only the tests that import them (`vitest related`).
- Only dependency or tooling changes (package.json, lockfile, tsconfig, configs, env, test setup) run the whole suite.
- Incremental type-check (7.4 s → ~2 s) and a lint cache.
- A task's own e2e runs at the gate only when other tasks depend on it.

**3. Plan width**
- `validate-plan` reports `shape` (wave widths, critical path).
- It warns on narrow plans (fewer than 3 ready after the first wave, for milestones of 6+ tasks) and on big foundation tasks (12+ files blocking 4+ tasks).

**4. Nothing reaches main unchecked**
- A hook stops the Designer editing product code or styles: only `.pumori/`, `docs/` and the stack's `designer_paths`.
- Flaky tests: the gate retries once. A pass on retry merges and records `FLAKY-n`, and `milestone-close` refuses until `pumori flaky fixed <id>` (after a fix task).

**5. Less waiting**
- Decide with the recommended option and log it, except: accepting a security or data gap, cutting a feature, or anything irreversible.
- The budget is set once per run or change request.
- Acceptance never holds anything.

**6. Journeys**
- The PM updates journeys a change request touches, never softening "Not satisfied if", and shows the human a before/after.
- `qa-milestone` gives each concurrent journey its own QA account slot (`accounts`, with `QA_ACCOUNT_<n>_*` in `.env`, `qa_accounts` in run.json). This needs extra test accounts from the human.
- Complaints repeated across 2+ journeys become fix tasks (at most 3 per milestone).

**7. Cost and context**
- `pumori cost` (units per role), also included in HANDOFF.md.
- The orchestrator keeps its context small: status JSON and event tails; state stays on disk.

Tested on a scratch project:
- full `./verify` passes;
- related mode ran only the importing tests;
- a planned test update was refused without `tests_ok` and passed with it;
- an unplanned protected-test edit was refused;
- a helper edit passed;
- a flaky test was merged and quarantined, and blocked the milestone close until fixed;
- the narrow-plan warning fired;
- the Designer was denied `globals.css` but allowed mockups;
- both workflow scripts parse.

Not yet run end to end with agents.
