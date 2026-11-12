# Getting started: from a PRD to a working app

Follow these steps in order. Each step says what to do and what you should see. You don't need to create the
project folder yourself: Pumori creates it in step 3.

## 1. Check your machine (once)

Open a terminal and run each line. Each one should print a version or "accepting connections".

```bash
node -v            # v22.x
corepack -v        # any version
psql --version     # 16.x
pg_isready         # accepting connections
python3 --version  # 3.10 or newer
git --version
```

If something is missing on macOS: `brew install node@22 postgresql@16 && brew services start postgresql@16`.
Node 22 from Homebrew is "keg-only": Pumori's stack finds it at `/opt/homebrew/opt/node@22/bin` by itself.

Optional: Docker Desktop (local staging at release), `brew install gitleaks semgrep` (security checks).

## 2. Install Pumori (once)

```bash
git clone https://github.com/akasrai/pumori.git ~/pumori
claude plugin marketplace add ~/pumori
claude plugin install pumori@pumori
```

Check: `claude plugin list` shows `pumori@pumori` as enabled. Restart the Claude desktop app (or open a new
terminal session) so new sessions load it.

Recommended, in `~/.claude/settings.json`:
- under `permissions.allow`, add `"Workflow(pumori:write-tests)"`, `"Workflow(pumori:build-wave)"` and
  `"Workflow(pumori:qa-milestone)"`, so the build never waits on an approval card;
- optionally `"env": {"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"}` for the spec debate.

## 3. Write the PRD

Make a Markdown file anywhere, for example `~/prds/my-app.md`. Plain language is fine. Include:

- **The problem and the users**: who uses it and why.
- **What they can do**: one bullet per capability ("Users can invite a teammate by email").
- **Rules**: limits, validation, who can see what ("Users only ever see their own projects").
- **Screens you care about**, if any.
- **The look**, if you care: "Pumori's default", "look like <product>" (you'll add screenshots in step 5), or your
  brand colours, font and logo. If you leave it out, the PM asks you.
- **Out of scope**: what it must not do yet.

A tiny example is `benchmarks/P1/prd.md` in the Pumori repo. Shorter PRDs give faster, cheaper runs: Pumori sizes
the process to the PRD (small S, medium M, large L).

## 4. Create the project

Open a **new Claude Code session in any folder** (for example your home folder) and type:

```
/pumori:new my-app ~/prds/my-app.md
```

- To put the project somewhere specific, say so: `/pumori:new my-app ~/prds/my-app.md in ~/Desktop/work/my-app`.
  The default is `~/pumori-projects/my-app`.
- To use a saved brand: add `with brand <name>` (see "Brands" in the README; `pumori brand list` shows yours).

What happens: Pumori copies its stack template into the new folder, writes its `.env` (database name and ports),
makes the first commit and runs a quick check (the first run installs packages, a minute or two). It ends with the folder path, the
app's local URLs and "open a session in that folder and run /pumori:factory".

## 5. Add reference material (optional)

If the product must match an existing product's look or screens, put screenshots (and any useful source files) in
`<project>/docs/reference/` now, then commit them:

```bash
cd ~/pumori-projects/my-app && git add docs/reference && git commit -m "docs: reference material"
```

## 6. Start the factory

Open a **new Claude Code session in the project folder** (in the desktop app: new session, choose the folder) and
type it yourself:

```
/pumori:factory
```

Typing it yourself matters: it lets the team open its desks (PM, Designer, Architect, QA, Dev) as visible sessions.

- Set a budget cap on the first run if you want one: `/pumori:factory budget 150000000` (units; see the README).
- When a **workflow approval card** appears, choose **Always**.

## 7. Answer the questions

The PM asks up to 10 questions (fewer for small PRDs), each with a proposed default. Answer in the chat, for example
"Q1 B, Q2 default, Q3: only admins can delete". "All defaults" is a valid answer.

## 8. Approve the spec and pick the design

- The PM writes the spec (`.pumori/spec/`), and the other roles challenge it.
- The Designer builds mockup screens with screenshots and may offer 2–3 directions: pick one or ask for a mix.
- You get a **UI look checkpoint** with screenshots: say what's wrong now, it's much cheaper than later.
- Approve, and the Architect plans milestones and tasks.

## 9. Let it build

From here it runs on its own, milestone by milestone: tests first, developers in parallel, review, merge, QA in a
real browser, hidden user journeys scored by judges.

- **Progress:** type `/pumori:status` in the run session, or open `.pumori/runtime/status.html`.
- **Desks:** open any desk session to see what that role is doing, or talk to it.
- **Quiet for a long time?** Type `continue` in the run session (the app pauses long chains of desk messages).
- **It asks you** only for real decisions: a budget raise, accepting a milestone with known gaps, anything
  irreversible. Answer, and it carries on.
- To run unattended, tell it: "don't wait on me, take the recommended option". It keeps using the desks.

## 10. Accept the product

At the end Pumori runs the full checks and writes **`HANDOFF.md`** in the project: what was built, test coverage,
journey results, known gaps, risky files and cost. Try the app yourself:

```bash
cd ~/pumori-projects/my-app && ./init.sh
```

It prints the web URL. Sign up and use it. Stop it with `./init.sh stop`. Then tell the run session "accept", or
list what to change.

## 11. Change it later

Open a session in the project folder and type:

```
/pumori:change "Add CSV export to the invoices list"
```

or point it at a file with a longer change request: `/pumori:change ~/prds/my-app-cr1.md`. The same team handles
it: spec update, new tests, build, QA.

For an existing codebase Pumori didn't create, open a session in that repo and run `/pumori:onboard` first.

## 12. Clean up

Pumori makes throwaway test databases while it works. When a project is finished:

```bash
cd ~/pumori-projects/my-app && pumori clean-dbs
```

(`pumori` is on the agents' PATH; in your own terminal use `~/pumori/plugin/bin/pumori`, or add that folder to
your PATH.) Delete a whole project by removing its folder and dropping its `pumori_<name>*` databases.

## If something goes wrong

| Symptom | What to do |
|---|---|
| `/pumori:new` or `/pumori:factory` is not recognised | `claude plugin list` must show `pumori@pumori` enabled; restart the app or open a new session |
| The quick check fails on a new project | Make sure Postgres is running (`pg_isready`) and `node -v` is 22 |
| The team has gone quiet | Type `continue` in the run session |
| It stops at the budget cap | Raise it: `/pumori:factory budget <bigger number>` |
| A milestone keeps failing QA | It asks you: give it one more round, or accept the known gaps and move on |
| You closed the run session | Open a new session in the project folder and type `/pumori:factory` again: it resumes |
