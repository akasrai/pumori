# Pumori

An AI software team that lives inside Claude Code. You give the **PM** a PRD; the team asks you the
questions that matter, writes a testable spec, designs the screens, plans the work, writes failing tests
first, builds in parallel git worktrees, reviews every change, uses the running app like a real user,
scores hidden user journeys, and hands you a working product on local staging with a handoff report.

You stay in charge at two checkpoints: **approve the spec and design** and **accept the product**.
The factory never deploys to production and never pushes.

**New here? Follow [GETTING-STARTED.md](GETTING-STARTED.md)**: step by step from installing to a working app.

## The team

| Agent | Does | Model |
|---|---|---|
| `pumori:planner` | Small (lane S) products: spec and task plan in one pass, checked by `check-spec` and `validate-plan` | Opus |
| `pumori:pm` | PRD → questions → EARS requirements, NFRs, threat model, hidden journeys, estimate (lanes M/L) | Opus |
| `pumori:designer` | Screen inventory, 2–3 HTML mockup variants with screenshots; visual review | Sonnet |
| `pumori:architect` | Data model, API contracts, authz rules, milestones (vertical slices), task graph; bug triage; unsticks tasks that don't converge | Opus |
| `pumori:test-designer` | Failing black-box tests per task from the requirements (incl. authz) | Sonnet |
| `pumori:developer` | Generalist: contract tasks (shared schemas, DB, component stubs) and rare full-stack tasks | Sonnet |
| `pumori:backend-dev` | Backend specialist: API routes, services, authz (fenced to the backend area) | Sonnet |
| `pumori:frontend-dev` | Frontend specialist: pages, components, states, a11y (fenced to the frontend area) | Sonnet |
| `pumori:reviewer` | Read-only review: correctness, security, test integrity, scope, design, simplicity | Opus |
| `pumori:qa` | Uses the integrated app in a browser: criteria, authz, a11y, perf, journeys | Sonnet |
| `pumori:judge` | Three independent lenses vote on each hidden journey | Haiku |
| `pumori:onboarder` | Makes an existing repo verifiable for the team | Opus |
| `pumori:gatekeeper` | Runs deterministic commands inside workflows | Haiku |

The `/pumori:desk` skill turns a session into a visible desk for one of these roles (sessions mode).

The `pumori` command (plain Python, on the agents' PATH) owns the truth: run state, the readiness
gate, the red check, the test guard, merges, verify, round caps, QA/judge records and the budget.
Only it can mark work as passing.

**Release is a command, not an agent:** `pumori release` runs the final checks, deploys staging if Docker
is already running, and generates `HANDOFF.md` from recorded facts (tasks, requirement coverage, journey
results, risky files, known gaps, cost).

## Lanes: the process scales with the PRD

Pumori sizes the PRD (`pumori lane`) and right-sizes everything:
- **S (small, target ~20 min):** lean spec (≤ 15 requirements), no spec debate or design variants,
  1 milestone with 2–5 tasks, browser tests once per milestone, one QA + judges pass.
- **M (target ~1.5 h):** ≤ 40 requirements, a clarify-only spec debate, 2 design variants, ≤ 3 milestones.
- **L:** the full process.

Override with `/pumori:factory lane M`.

**Avoid stalls:** choose **Always** on the first workflow approval card. To skip the cards entirely, add this
to the `permissions.allow` list in `~/.claude/settings.json`:
`"Workflow(pumori:write-tests)", "Workflow(pumori:build-wave)", "Workflow(pumori:qa-milestone)"`.

## Parallel specialists

The Architect plans **contract first**: one small contract task (shared schemas, DB table, component
stubs), then backend and frontend tasks **in parallel**, split further for big features as long as files
don't overlap. Each task goes to its specialist, each in its own worktree. Browser tests run at the
milestone check, after backend and frontend are merged. Developers working at once: lane S 3, M 4, L 6.
The stack pack declares the areas (`areas` in `stack.json`), so this works for other stacks too.

## Two ways the team runs

**Sessions mode (default in the desktop app when you start the run yourself).** The team appears as
sessions nested under your run:
- A desk for each of the PM, Designer, Architect and QA, plus Release at the end.
- One **Dev lead** desk. The parallel backend, frontend and generalist developers run in the background
  inside it, so you see the whole build in one place.

Open any desk to see exactly what that role did, or type to it. Desks talk to each other directly. For
example, the PM runs the spec debate with the Architect, QA and Designer, and QA sends bugs straight to the
Architect for triage.

Inside each desk the work is done by that role's agent, so every guard still applies. Reviewers, judges and
gate checks run as quick background agents, and their verdicts are posted into the developer desk.

If the team goes quiet after many hand-offs, type `continue` in your run session. The app pauses long
chains of session-to-session hand-offs until you write.

**Agents mode (fallback, unattended, terminal, benchmarks).** The same roles run as background agents and
workflows inside one session, visible in its Background tasks pane. Force it with `"mode": "agents"` in
`.pumori/run.json`.

Either way, `/pumori:status` writes `.pumori/runtime/status.html`, which has a **Who did what** timeline
(every role's actions, verdicts and rounds) and links to each desk.

## How a run flows

```
/pumori:new → /pumori:factory
  PM questions ─► you answer ─► PM spec + hidden journeys ─► spec challenge (agent team or parallel critics)
  ─► Designer mockups ─► YOU APPROVE spec + pick design ─► Architect plan ─► validate-plan (PASS/CONCERNS)
  for each milestone:
     write-tests workflow   Test Designers → red check (must typecheck AND fail) → commit + protect
     build-wave workflow    ≤3 developers in worktrees → reviewer → gate (review@sha, test guard,
                            merge to main, verify) → fix rounds ≤3 → conductor
     qa-milestone workflow  QA on the running app + hidden journeys × 3 judges → bugs → architect
                            triage → fix tasks with regression tests → repeat (≤2 QA cycles)
  ─► Release: full verify, security, staging, HANDOFF.md ─► YOU ACCEPT
```

## Why it should beat other setups

It takes the best proven piece for each job:
- **Spec**: Kiro / Spec Kit / cc-sdd EARS requirements with `[NEEDS CLARIFICATION]`; BMAD-style readiness gate.
- **Truth outside the model**: big-tech "blueprints" (Stripe, Shopify), implemented as Claude Code workflows plus a deterministic CLI.
- **Tests that can't be gamed**: separate Test Designer, red check, protected tests, test guard, and a reviewer lens for special-casing.
- **Fresh context per task, small tasks, capped rounds, conductor**: Superpowers, Anthropic harness posts, Stripe (2 CI rounds), Kiro conductor.
- **QA that actually uses the product**: gstack `/qa`, Anthropic's skeptical evaluator, Factory Missions' milestone validation.
- **Hidden user journeys scored by independent judges**: StrongDM. This is the part almost nobody else does.
- **Learning loop**: Compound Engineering's lessons, kept per project (`.pumori/lessons.md`) and globally (`~/pumori-home/lessons.md`).
- **Golden-path stack packs**: what app builders do (Lovable, Replit, v0). The team never builds infrastructure from scratch.
- **Guardrails as hooks**:
  - Role permissions: developers can't touch tests or the spec.
  - Hidden journeys are visible only to the PM, QA and Judge.
  - Run state is written only by the CLI.
  - There's a budget cap and a no-push rule.

## Requirements

- **Claude Code** with a plan that has room for long runs (see Cost). The Claude desktop app is needed for sessions
  mode (visible desks); in a terminal Pumori runs in agents mode.
- **macOS or Linux** with Python 3.10+, git, **Node 22** (with corepack) and **PostgreSQL 16** running locally, reachable as
  your OS user. On macOS: `brew install node@22 postgresql@16 && brew services start postgresql@16`.
- Optional: Docker (local staging at release), gitleaks and semgrep (security checks; skipped if missing), and a
  Playwright MCP server for QA browser work.

## Install (once)

```bash
git clone https://github.com/akasrai/pumori.git
```
```bash
claude plugin marketplace add ./pumori
```
```bash
claude plugin install pumori@pumori
```
Or for a single session: `claude --plugin-dir ./pumori/plugin`.

Put the CLI on your PATH (the agents call it): `export PATH="$PWD/pumori/plugin/bin:$PATH"`.

Recommended:
- Enable agent teams for the spec debate: add `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` to `~/.claude/settings.json`. This is optional; without it, Pumori uses parallel critics.
- Allow workflows: approve `pumori:*` workflows once ("don't ask again"), or add `Workflow` to your allow rules.

## Use

1. `/pumori:new my-app path/to/prd.md`. This creates `~/pumori-projects/my-app` from the stack pack.
2. Open a Claude Code session **in that folder** and type `/pumori:factory` yourself. Typing it yourself is what allows the team's desks to open as nested sessions.
3. Answer the PM's questions, approve the spec and pick a design, then let it run. Check progress with `/pumori:status`,
   which also writes the auto-refreshing page `.pumori/runtime/status.html`.
4. Accept the handoff, or request changes later with `/pumori:change "…"`.

Existing codebase: open a session in the repo and run `/pumori:onboard`, then `/pumori:factory` or `/pumori:change`.

## Look and brands

Every product follows one design guide (`docs/design.md` in the stack template): sharp and quiet, Vercel-style layouts,
neutral surfaces, hairline borders and **one accent colour**. The default accent is indigo and the default font is
Geist. All colours live in one theme file and the font in one folder, so a brand changes the look without touching
the rules.

- **Ask at the start.** Without a brand, the PM asks how the product should look: Pumori's default, match an existing
  product (put its screenshots or code in `docs/reference/`), or your brand's colours, font and logo. The Designer
  applies the answer to the theme before the build starts.
- **Saved brands.** Make a folder `~/pumori-home/brands/<name>/` with `brand.json` (`{"name": "...", "description": "..."}`),
  `theme.css` (the template's `apps/web/app/theme.css` with your colours), and optionally `fonts/` (a `font.ts` exporting
  `fontSans` with the `--font-brand-sans` variable, plus font files) and `logo.svg`. Then
  `/pumori:new my-app prd.md --brand <name>`, or `pumori brand apply <name>` in an existing project.
  `pumori brand list` shows your brands. Brands stay on your machine; they are never part of the repo.

## Cost

Pumori is thorough, and that costs tokens. Measured runs (units below):
- a small to-do app (benchmark P1): about 30 minutes and 7M units;
- a real mid-size internal app (8 milestones, 130 tasks, two change requests): about 44 working hours and 344M units.

Large products need a plan with a high usage limit. Set a budget cap per run (below) and the run stops cleanly at it.

## Budget

- Measured in **units ≈ input-token equivalents**: output ×5, cache writes ×1.25, cache reads ×0.1. The numbers are read from Claude Code's session logs.
- The default cap is 60M units per run. Change it with `/pumori:factory budget 80000000` or `limits.budget_units` in `.pumori/run.json`.
- At the cap, a hook stops all Pumori agents and `pumori next` reports `blocked`.
- Other limits: round cap 3 per task, 2 QA cycles per milestone, at most 3 parallel developers (`limits` in `run.json`).
- For unattended runs with an API key, also pass `--max-budget-usd` to `claude -p`.

## Folders

```
pumori/
  .claude-plugin/marketplace.json   local marketplace
  plugin/                           the Claude Code plugin
    agents/  skills/  workflows/  hooks/hooks.json
    bin/pumori                      deterministic CLI (state, gates, budget, hooks)
  stacks/next-fastify-postgres/     stack pack 1: template + stack.json contract
  benchmarks/P1 P2 P3/              fixed PRDs + hidden journeys to measure the factory
~/pumori-projects/<name>/           products (git repos, main = integration branch)
~/pumori-home/scenarios/<name>/     hidden journeys (outside the product repo)
~/pumori-home/lessons.md            lessons shared by every future run
~/pumori-home/bench/results.jsonl   benchmark history
```

## Adding a stack

Make `stacks/<name>/` with `template/` and a `stack.json` that follows the same contract:
- `init` and `verify` commands with `--quick`, `--tests`, `--e2e` and `--security` modes;
- quiet output that shows only errors;
- worktree-safe;
- `test_globs`, `test_naming`, `skip_marker_regex`.

The team doesn't change.

## Status

**v0.7.1.** Benchmarked on small PRDs and used to build a real mid-size internal app end to end, including two change
requests. The full history of what was measured and changed is in `IMPROVEMENTS.md`.

Limits today:
- one stack pack (Next.js + Fastify + Postgres); more stacks need new packs;
- local Postgres and Node 22 on macOS or Linux;
- the factory never deploys to production.

## License

MIT. See `LICENSE`.
