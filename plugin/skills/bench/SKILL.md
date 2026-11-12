---
name: bench
description: Benchmark the Pumori factory itself on the fixed benchmark PRDs (P1 tiny to-do, P2 notes with login, P3 expense splitting) and compare with earlier results, so changes to prompts, skills or models are measured. Use after changing Pumori, or to compare against an off-the-shelf setup.
argument-hint: "[P1|P2|P3] [label]"
---

1. Benchmarks live in the Pumori folder's `benchmarks/` (sibling of the plugin: `${CLAUDE_PLUGIN_ROOT}/../benchmarks`).
   Each has `prd.md`, `answers.md` (pre-answered PM questions, so runs are comparable) and `journeys/`
   (the hidden journeys; the PM's own journeys are replaced by these for scoring).
2. Run `pumori bench-setup <P> <label>`. It creates `~/pumori-projects/bench-<p>-<label>` from the
   benchmark PRD, installs the fixed hidden journeys, the pre-answered questions and an autopilot file
   (`fixed_journeys: true`, so scores stay comparable), and commits.
3. Tell the user to open a session in the new project and run `/pumori:factory` (autopilot answers the
   checkpoints). Unattended alternative, in that folder:
   `claude -p "/pumori:factory continue" --permission-mode auto --allowedTools Workflow`.
4. When a run ends, `pumori bench-score --label <label>` appends to `~/pumori-home/bench/results.jsonl`.
   Show a comparison table of all results for that benchmark: journey pass rate, tasks, rounds,
   budget units, plugin version.
