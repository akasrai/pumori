---
name: new
description: Create a new Pumori product project from a PRD and a stack pack (default next-fastify-postgres), ready for /pumori:factory. Use when the user wants Pumori to build a new product from a PRD.
argument-hint: "<project-name> <path-to-prd.md> [stack]"
---

Create a new Pumori project.

1. Get from `$ARGUMENTS` or ask: project name (kebab-case), PRD path, stack (default
   `next-fastify-postgres`, TypeScript throughout; `next-fastapi-postgres` for a Python (FastAPI) API with the
   same Next.js web app; list available stacks with `ls` on the plugin's `stacks/` folder:
   `${CLAUDE_PLUGIN_ROOT}/../stacks` or `${CLAUDE_PLUGIN_ROOT}/stacks`). If the user pasted the PRD text
   instead of a path, save it to a temp `.md` file first.
2. Run `pumori new <name> --prd <path> --stack <stack>` (add `--dir <path>` only if the user named a folder;
   default is `~/pumori-projects/<name>`). Add `--brand <name>` when the user names a saved brand (`pumori brand list`
   shows them; a brand is a folder in `~/pumori-home/brands/` with `brand.json`, `theme.css`, optional `fonts/` and
   `logo.svg`). Without a brand the product gets Pumori's default look, and the PM asks about the look.
3. In the new directory run `./verify --quick` to make sure the template is healthy (first run installs
   dependencies; it can take a minute or two).
4. Tell the user, in 4 lines: where the project is, its local URLs/ports, and the next step:
   open a Claude Code session **in that folder** and run `/pumori:factory`. (Pumori's developers use git
   worktrees of that repo, so the session must be rooted there.)
