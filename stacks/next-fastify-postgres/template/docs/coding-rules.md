# TypeScript coding rules (frontend and backend)

Common TypeScript team conventions, adapted to this stack (Next.js + Fastify + zod + Drizzle).
**[lint]** = enforced by `./verify` (eslint/tsc); **[review]** = the reviewer checks it.
Rules marked *(added)* close gaps in the same spirit.

## General
- TypeScript `strict` everywhere. Never use `any`; use `unknown` and narrow it. [lint]
- No `@ts-ignore`/`@ts-nocheck`; fix the type. [lint]
- No unsafe `as` casts; cast only right after a runtime check or a zod parse. [review]
- **Arrow functions only**, for functions and components: `const name = (...) => {...}`. [lint]
- Spread conditionally with `...(cond ? obj : {})`, never `...(cond && obj)`. [lint]
- Keep it simple: no nested ternaries, no clever one-liners, no abstraction with a single use. [lint/review]
- Search for an existing util, hook or component before writing one; don't duplicate 5+ lines. [review]
- Name magic numbers and strings as constants (`HOUR_MS`, `REQUEST_TIMEOUT_MS = 15_000`). [review]

## Naming & files
- File names are kebab-case and start with the module name: `todo-api.ts`, `use-todos.ts`, `todo-list.tsx`. [review]
- Role suffixes: `*-types.ts`, `*-constants.ts`, `*-utils.ts`, `*-api.ts`, `use-*.ts`, `*.schema.ts`. [review]
- Group code by feature module (`components/todos/`, `hooks/todos/`), not by page. [review]
- Components are PascalCase with the module name first (`TodoListItem`); props interface is `<Component>Props`. [review]
- Constants are UPPER_SNAKE; constant maps are `as const`. [review]
- Hook results: `isLoading` for reads, `is<Verb>ing` for writes (`isDeleting`), data named after the entity, `error`. [review]

## Imports & modules
- **Named exports only.** Default exports only where a framework requires them: Next `page`/`layout`/`error`/
  `loading`/`not-found` files and `*.config.*`. [lint]
- Import groups, with a blank line between groups: external → workspace packages (`@app/shared`) →
  app-internal → relative siblings. Merge duplicate imports. [review]
- `import type` / inline `type` for type-only imports. [lint]
- Shared packages never import apps or framework code; pass context in as arguments/props. [lint]

## Types & validation
- `interface` for object shapes and props; `type` for unions and derived types. [lint]
- **No enums**: use an `as const` object plus a derived union, `type Status = (typeof STATUS)[keyof typeof STATUS]`. [lint]
- Every external input (request body/params/query, env, upstream responses, localStorage) is `unknown`
  until parsed with the shared zod schema. [review]
- Schemas live in `packages/shared` (`*.schema.ts` or the module file); frontend forms and backend routes
  use the **same** schema, and domain types are `z.infer`'d from it. [review]
- Validation messages come from one constants object and name the rule (never a generic "invalid input"). [review]
- Trim strings before required/length checks: `z.string().trim().min(1, MESSAGES.TITLE_REQUIRED)`. [review]
- Route paths, query keys, storage keys and permission names come from constants, never raw strings. [review]

## Errors & async
- async/await with try/catch; no `.then` chains. Never leave a promise unhandled. [review]
- One error body across the API: `{ error: { code, message } }` (see `packages/shared/src/errors.ts`). [review]
- Model failures as `Error` subclasses with `readonly status`/`code` and narrow them with `instanceof`. [review]
- Map upstream failures deliberately: 401→401, 403→403, 404→404, timeout/5xx/unreachable→502. [review]
- Every outbound HTTP call has a timeout (`AbortSignal.timeout(ms)`). [review]
- The UI shows errors inline or as a toast, with the server message or a fallback message constant. [review]

## Frontend (Next.js)
- Data flow is strict: `lib/api/*-api.ts` functions → hooks (`hooks/<module>/use-*.ts`) → components
  (folders live at the web app root: `apps/web/{app,components,lib,hooks}`, no `src/`).
  Components and pages never call `fetch` directly. [review]
- Never fetch with `useState` + `useEffect`. Use server components for initial data, and TanStack Query
  (`useQuery`/`useMutation`) for client-side server state when a feature needs it *(added: add
  `@tanstack/react-query` the first time)*. [review]
- Every hook exposes loading and error state, and every consumer renders both (plus empty state). [review]
- Pages and layouts are thin: composition only; logic lives in hooks and pure utils (which are tested). [review]
- Base UI elements are generic: no domain props, accept `className`, extend native element props. [review]
- User-facing text comes from a per-module messages constants object, not scattered literals. [review]
- Build UI from `components/ui` and the shell (`docs/design.md`, gallery at `/dev/ui`); only `components/ui` imports Radix, sonner or cva. [lint]
- Use the semantic colour tokens (`app/globals.css`: `bg-primary`, `text-muted-foreground`...), never raw Tailwind shades or hex colours. [lint]
- Never put secrets in `NEXT_PUBLIC_*`; server-only modules import `'server-only'`. [review]
- React hooks rules. [lint]

## Backend (Fastify)
- Every route validates body/params/query with the shared zod schema; invalid input → 400. [review]
- Check order in a handler: **authenticate** (session) → **authorize** (membership or ownership; another
  user's resource is 404) → **validate** the body → rate-limit-sensitive work (password checks, sends,
  per-key limits) → side effects. Never write or call out before authorization, and never tell an
  outsider whether a resource exists by validating its body first. [review]
- User-owned data: every query filters by the session user; another user's resource is **404**. [review]
- Handlers are thin; logic lives in plain service/util functions; DB access stays in the data layer (Drizzle). [review]
- Inject time, ids and clients as parameters (`now = Date.now`) so logic is testable. [review]
- Config comes from the zod-validated env module (`src/env.ts`); no `process.env` elsewhere. [review]
- Log through Fastify's logger (no `console.log`); one structured line per outcome; never log user text,
  tokens or personal data. [lint/review]

## Data safety
- DB `CHECK` constraints mirror the zod rules for money and enum-like columns (amount > 0, status in
  the `as const` values), so a bug or a script cannot store what the API would reject. [review]
- Aggregates that must agree (balances, totals, "X of Y" counts) are read from one snapshot: a single
  SQL statement, or a `REPEATABLE READ` read-only transaction for several queries. [review]
- "One active X per Y" rules (one open invite per email, one default address) get a partial unique
  index (Drizzle `uniqueIndex(name).on(cols).where(condition)`), not a check-then-insert. [review]
- Create endpoints where a retried request causes harm (money movements, invites, sends) accept an
  `Idempotency-Key` header and return the first result for a repeated key. [review]
- Lists that grow (feeds, history, audit logs) are paginated with keyset pagination
  (`where (created_at, id) < (cursor)`, `limit n`), never unbounded or `OFFSET`-deep. [review]
- Every outbound call and DB statement has a timeout (`AbortSignal.timeout`, the pool's
  `statement_timeout`); long jobs set their own explicitly. [review]
- Never log tokens, secrets or personal data (emails, names, message bodies); log ids. URLs are
  redacted by the request serializer, but don't put secrets in URLs, and never use a UUID as a secret
  token (use `randomBytes(32).toString('base64url')`). [review]

## Testing
- Tests ship with the feature, never as a follow-up. [review]
- Always test: utils (edge cases), schemas (one valid and one invalid case per rule, asserting the
  message), routes (every status and the authz case), and components with conditional rendering (one
  render per branch). [review]
- Don't test pure layout, constants or types; move hook logic into utils and test those. [review]
- Test names are behaviour sentences ("user B gets 404 for user A's to-do"). [review]
- No `.only`/`.skip`; no tests that can't fail or depend on the real clock. [lint (test guard) / review]

## Formatting
- Single quotes, semicolons, 2-space indent. [lint]
- A blank line before `return`, `if`, `for`, `while`, `do`, `switch`, `throw`, `try`, and between distinct steps. [lint]
- Comments explain *why*, in plain sentences; `/** */` on exported functions and non-obvious fields. [review]

## Not adopted from the source repo
These are product- or infra-specific:
- "`'use client'` on every page" (it throws away Server Components);
- Formik/Yup (zod replaces them; the rules are kept);
- axios refresh interceptors, `X-User-Id` headers, the "encrypted" localStorage;
- their locale namespaces, permission HOCs, token names, Sentry and CI scripts.
