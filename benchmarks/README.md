# Pumori benchmarks

Fixed PRDs used to measure the factory itself. Run after every change to Pumori's prompts, skills,
workflows or models: `/pumori:bench P1 <label>`.

| Id | Product | Size | What it stresses |
|---|---|---|---|
| P1 | Tiny to-do | ~3–5 tasks | the basic loop, authz, validation, XSS, long lists, two-tab staleness |
| P2 | Notes with tags, search, pin, archive | ~20–40 tasks | search, ordering rules, persistence |
| P3 | Expense splitting with invites | ~15–30 tasks | money maths to the cent, multi-user, single-use invites, activity history |

Each folder: `prd.md`, `answers.md` (pre-answered PM questions so runs are comparable) and `journeys/`
(hidden journeys; the factory never shows them to developers). Benchmark journeys use `requires: [ALL]`: they run as the final exam once every task has passed,
so they don't depend on how the PM numbers requirements.

Results: `~/pumori-home/bench/results.jsonl` (journey pass rate, tasks, rounds, budget units, plugin version).
Baseline to beat: run the same PRD through an off-the-shelf setup (e.g. Superpowers, or plain Claude Code
with "build this PRD") and score it with the same journeys.
