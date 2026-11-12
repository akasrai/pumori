---
name: status
description: Show the live status of the current Pumori run - stage, tasks, rounds, journeys, budget, preview URLs and recent events - and refresh the status page.
---

Run `pumori status --json --html` and `pumori budget`. Reply in ≤ 12 lines: stage, milestone progress,
tasks (passed / in progress / blocked), journeys satisfied, budget used, preview URL, the last 5 events,
and the status page path (`.pumori/runtime/status.html`, auto-refreshes every 20s; offer to open it).
If anything is blocked, say what decision is needed.
