# Design guide

Products built on this template get a sharp, quiet, Vercel-style look: neutral surfaces, hairline borders and one
accent colour. The colours live in `app/theme.css` and the font in `app/fonts/`; a brand (`pumori brand apply <name>`,
or the Designer from the PRD's look answer) replaces only those, so every rule below holds under any brand. **Build UI only from `components/ui/*`
and the shell (`components/shell/*`)**; lint rejects raw colours and direct Radix/sonner imports.
See every component, variant and state at **`/dev/ui`** (dev only; `app/dev/ui/page.tsx`).

## Principles

- **Sharp and quiet, like Vercel's dashboard.** Pure white (`#fff`; dark `#0a0a0a`), hairline borders
  (`#eaeaea`; dark `#1f1f1f`), no decorative fills, no shadows on cards or inputs.
- **Typography first.** Hierarchy from size and weight (the brand font; Geist by default), not colour or boxes.
  **One accent:** `primary` (indigo `#4f46e5` by default, lighter in dark) marks the one main action per view. Status
  colours (`success`, `warning`, `destructive`, `info`) only mean status, sparingly.
- **Semantic tokens only** (`app/globals.css`): `bg-primary`, `text-muted-foreground`, `border-border`...
  Never `bg-blue-500`, never hex. Dark mode follows the OS. **Generous outside, tight inside.**

## Sleek checklist

Check every screen against this before you call it done (the gallery at `/dev/ui` follows it).

1. **Surfaces:** white page and white sidebar (one hairline right border, not a grey panel); `border`
   hairlines; no shadow on cards, inputs or buttons. Menus, popovers, dialogs and toasts use
   `shadow-popover` (one tight shadow) plus a border. Grey (`accent` `#f5f5f5`, `surface` `#fafafa`)
   only for hover, active and selected states.
2. **Shape:** 6 px radius (`rounded-md`/`rounded-lg`) for controls and cards, 10 px (`rounded-xl`) for
   dialogs; round only for badges and avatars; 1 px borders only.
3. **Type:** page title 24 px semibold `tracking-tight` (`PageHeader`); card and dialog titles 15 px
   semibold (`text-title`); section titles 14 px semibold; body 14 px; secondary text 13 px muted
   (`text-caption text-muted-foreground`, `#666` / dark `#a1a1a1`); labels 13 px medium. Sentence case.
4. **Numbers and IDs:** numbers `tabular-nums`, right-aligned in tables; IDs, hashes and code `font-mono`.
5. **Icons:** lucide at stroke 1.5 (global default), 16 px (14 px in dense rows), muted grey, only where
   they add meaning. Standalone icons use `<Icon icon={X} />` (`components/ui/icon.tsx`).
6. **Shell:** top bar 56 px + 44 px tab row, white, bottom hairline; a 20 px square mark + 14 px semibold
   name; `/` before the context switcher; muted 14 px tabs, the active one black with a 2 px bar on the
   hairline; a 32 px avatar. Sidebar items 32 px, muted, active = black text on `#f5f5f5`, 6 px radius.
   No footer inside the app.
7. **Buttons:** primary solid accent (`bg-primary`); everything else `outline` (white, hairline) or `ghost`; 36 px;
   150 ms colour transition; focus = 2 px `ring` outline with a 2 px offset (`focus-ring` utility).
8. **Inputs:** white, hairline `input` border, no inner shadow; focus shows the `ring` outline; no glow.
9. **Badges:** 20 px, 12 px text, pale tint + hairline; status = `dot` + word (`<Badge dot variant="success">Paid</Badge>`).
10. **Tables:** no zebra, no header fill; 13 px muted header; hairline rows; row hover `#fafafa`.
11. **Cards:** hairline, no shadow, 20 px padding, title + muted description. Don't nest cards.
12. **Empty states:** plain text in a hairline box (title 14 px semibold, one muted line, one action).
13. **Spacing:** 4 px grid; content `max-w-6xl` with 32 px page padding (16 px on phones).
14. **Auth pages:** no card; centred 360 px column, mark above, 24 px title, hairline, a black link.

## Never do

- Sparkles, magic wands or other "AI" icons (lint rejects the imports); emoji in UI text.
- Icons inside tinted circles, illustrations in empty states, decorative icons on stat cards.
- Gradients, glows, heavy shadows (`shadow-lg`/`xl`/`2xl` outside `components/ui` fail lint).
- Dashed boxes, grey panels or grey page backgrounds as decoration, zebra stripes.
- All-caps or letter-spaced section labels; bold-heavy table headers.
- Blue links for primary navigation (nav and links are foreground; `text-link` only inside long prose).
- More than one accent colour on a screen; a second solid primary button in the same view.
- Pills for anything but badges and avatars; borders thicker than 1 px; copyright footers in the app.
- Scrollbars where nothing needs to scroll: never `overflow-auto`/`overflow-scroll` on headers, top bars, menus, panel
  headers or toolbars. Only the designated scroll areas scroll (a list, a tree pane, the main content). Fix
  overflow at the source (truncate, wrap, min-w-0) instead of adding a scroll box.
- Developer tools (mail outbox, UI gallery) in the product's navigation. They are dev-only URLs.

## Choosing a shell

All signed-in pages live in `app/(app)/`; its layout renders `AppShell`, which draws the product's shell
from **`APP_SHELL`** in `lib/app-constants.ts` (`'sidebar' | 'topbar'`, default `'sidebar'`). Both
shells read the same `SHELL_NAV` (`components/shell/shell-nav-items.ts`), so switching is that one line.
Both are previewed live at `/dev/ui` (§ App shells) and full-page at `/dev/ui/shells/sidebar|topbar`.

| Shell | Pick it for | Looks like |
|---|---|---|
| `'topbar'` | **≤5 main sections**; project- or entity-centric products (you work *inside* one project, team or workspace) | Vercel: sticky header (logo + name, optional `contextSwitcher`, account menu right) over underline tabs; content centred at `max-w-6xl`; below `md` the tabs scroll sideways in the header |
| `'sidebar'` | **many sections**, nested groups (section labels), admin-heavy back offices | 220 px white sidebar behind one hairline (brand, switcher, grouped nav, account row at the bottom); below `md` a top bar whose menu button opens the nav in a sheet |

The **Designer** decides, records the choice and the reason in `.pumori/design/chosen.md`, then sets
`APP_SHELL`. A top bar with more than 5 items, or one that needs groups, means the sidebar was the
right call. For a team/project switcher pass `contextSwitcher={<ContextSwitcher … />}`
(`components/shell/context-switcher.tsx`) to `AppShell`. Every page starts with `PageHeader` (one `h1`).
Signed-out pages use `AuthShell` (the mark above one centred 360 px column, no card).

## Layout patterns

| Pattern | Build it with |
|---|---|
| Dashboard | `PageHeader` → row of `StatCard` (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`) → `Card`s with the most important list or chart. Each stat links to the filtered list (`href`). |
| List | `PageHeader` (primary action "New x" on the right) → `DataTable` with `toolbar` (search `Input`, `Select` filters, "Clear filters"), `empty` (`EmptyState`), `pagination` (keyset: `nextHref`). Row actions in a `KebabMenu`; the first cell links to the detail page. Dense example: gallery § Dense table (Vercel's deployments list). |
| List → detail | Detail page: `PageHeader` with `Breadcrumb` (List › Item), `actions`, and `Tabs` as `children` for sub-views; content in `Card`s. |
| Create / edit | `Sheet` (side panel) with a form: `SheetHeader`, `SheetBody` of `FormField`s, `SheetFooter` (Cancel, Save). Use a full page only for long multi-section forms; `Dialog` for 1–2 field tasks (rename). |
| Settings & forms | One `Card` per topic (`CardHeader` title + description, `CardContent` fields, `CardFooter` with Save on the right). Fields stack with `gap-4`; two columns only from `md` for short related fields. |
| Destructive action | `AlertDialog`: title names the object ("Delete “Acme”?"), description states the consequence and that it cannot be undone, `AlertDialogAction` repeats the verb ("Delete project"). Destructive menu items go last, after a separator, `variant="destructive"`. |
| Empty | `EmptyState`: what is empty, why or what the user gains, one action. Filtered-to-nothing offers "Clear filters". |
| Focus (document pages) | `FocusShell` (`components/shell/focus-shell.tsx`): full screen, no app nav, no context switcher and **no account menu**.
- **Header:** the product's logo (`logo` prop; `/brand/logo.svg` when the brand has one), then the title and its status badge right next to it.
- **Optional fixed toolbar** under the header: underline tabs on the left (`toolbarStart`, e.g. Draft / Preview) and **all** the page's action buttons on the right, on the same line (`toolbarEnd`).
- **Scrolling:** the left tree and the main content are the **only** scroll areas and scroll independently; the window never scrolls. Use it for reports, drafting pages and readers, where the content is the product. |

## Density, spacing and type

**Matching an existing product comes first.** When the PRD says screens must look like an existing product, take
that product's spacing, type sizes, component heights, colours (including status and score colour codes) and
scrollbar style from its reference screenshots and code (`docs/reference/`). Map them onto these tokens; don't apply
the compact defaults below.

Otherwise, compact like Vercel. The values live in the theme (`app/globals.css`: `--spacing-control*`,
`--spacing-row`, `--spacing-touch`) and the component variants; don't resize with ad-hoc classes.

- **Text:** base 14 px (`body` is `text-sm`); the full scale is in § Sleek checklist. Max ~70 characters per line.
- **Controls:** `Button` 36 px (`h-control`), `size="sm"` 32 px (toolbars, table rows, card actions),
  `lg` 40 px (rare); `icon`/`icon-sm` 36/32 px. `Input` and `SelectTrigger` 36 px. Sidebar nav items 32 px.
- **Tables:** 40 px rows (`h-row`, `px-3 py-1` cells), 36 px header. Cards, dialogs and sheets pad 20 px.
- **Gaps on the 4 px grid:** `gap-1/2` inside controls, `gap-3/4` between related items and form
  fields, `gap-4` between cards, `gap-8`/`gap-10` between page sections.
- **Touch (< 768 px):** buttons, inputs, selects, tabs, nav and menu items grow to 44 px
  (`max-md:h-touch`, built into the variants); checkbox, radio and switch have enlarged hit areas.
  Inputs use 16 px text on phones (no iOS zoom).

## Responsive (check at 390 px)

- No horizontal page scroll. Wide tables scroll inside their own box; mark secondary columns
  `hideOnMobile`.
- Stack by default, go side by side from `sm`/`md` (`flex-col sm:flex-row`, `grid md:grid-cols-2`).
- Tap targets ≥ 44 px below `md` (built into the components, § Density). Page actions wrap under the
  title on mobile. Neither shell scrolls the page sideways (top-bar tabs scroll inside the header).

## The four states of every view

1. **Loading**: `Skeleton` in the shape of the content (`DataTable isLoading`, `StatCard isLoading`,
   `loading.tsx` for routes). `Button isLoading` for submits. No full-page spinners.
2. **Empty**: `EmptyState` with the next action.
3. **Error**: inline `Alert variant="destructive"` in the form or section that failed, with the
   server's message (`result.error.message`) and a retry where it makes sense. Field errors go in
   `FormField error`. Route crashes fall back to `error.tsx`.
4. **Success**: `toast.success('Invoice sent')` from `@/components/ui/sonner` after a mutation, then show
   the result (close the sheet, update the list). Don't toast on page loads.

## Formatting (`lib/format-utils.ts`)

- Numbers `formatNumber` (1,234,567); dashboards may use `formatCompactNumber` (1.2M); percent
  `formatPercent(ratio)`.
- Money is integer minor units end to end; display with `formatMoney(cents, currency)` → "$1,234.56".
  Right-align amounts (`align: 'right'`, `tabular-nums`); negative as "-$5.00", never colour alone.
- Dates `formatDate` ("Nov 7, 2026"), `formatDateTime`, `formatRelativeTime` for recent activity
  ("5 minutes ago"; older than a week shows the date). Pass `timeZone` for calendar dates (due dates).
- Empty values show "—", never "null", "N/A" or 0.

## Writing

- Sentence case everywhere ("Create project", not "Create Project"). No trailing periods in labels,
  buttons, titles or toasts.
- Buttons are verbs naming the result: "Save changes", "Send invite", "Delete project". Never "OK",
  "Submit", "Yes".
- Labels are nouns ("Email", "Due date"); help text goes in `description`, never in placeholders.
  Mark optional fields `optional`; everything else is required.
- Errors say what happened and how to fix it: "Enter a valid email address", "Amount must be more
  than $0". Never blame the user, never show codes or stack traces.
- Messages live in a per-module constants object (coding rules).

## "Next action" shortcuts

Every summary leads somewhere: a `StatCard` with `href` + `actionLabel` ("7 overdue" → "Review
overdue" → the list pre-filtered by URL), empty states carry the create action, toasts may carry an
`action` ("Undo", "View invoice"), and detail pages put the most likely next step as the primary
button. One click from the dashboard to the thing the user must do next.

## Accessibility

- WCAG 2.2 AA in light and dark (text keeps 4.5:1, `muted-foreground` included). Badge and alert text
  use the `*-subtle-foreground` tokens; don't put status text on other backgrounds.
- Every control has a visible label (`FormField`); icon-only buttons have `aria-label`; kebab menus
  name their object ("Actions for INV-1042"); tables have a `label`.
- Never convey meaning by colour alone: badges have words, trends have arrows and signs.
- Keyboard: everything reachable and visible on focus (focus ring is built into the components);
  dialogs and sheets trap focus and close on Escape (Radix). The shell has a skip link.
- One `h1` per page (`PageHeader`); card titles are `h2` by default.
- e2e runs axe on key screens (login and home in dark mode too) and both shell previews at desktop
  and 390 px, and checks 44 px header tap targets (`e2e/design-system.spec.ts`); add your screens to it.

## Adding to the design system

Need something new? Check `/dev/ui` first. If it really is missing, add a generic component (no
domain props, accepts `className`, tokens only) to `components/ui/`, following shadcn/ui's source
and our coding rules, and add it to the gallery (`components/dev/`). Feature components compose
`components/ui` and live in `components/<module>/`.
