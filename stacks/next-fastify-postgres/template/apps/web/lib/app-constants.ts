/** Product name shown in the shell, the auth pages and the page title. Rename it per product. */
export const APP_NAME = '{{APP_NAME}}';

/** The two signed-in layouts (docs/design.md § Choosing a shell). */
export const SHELL = { SIDEBAR: 'sidebar', TOPBAR: 'topbar' } as const;
export type ShellKind = (typeof SHELL)[keyof typeof SHELL];

/**
 * Which shell the `(app)` layout renders: `'sidebar'` (many sections, admin-heavy back offices) or
 * `'topbar'` (≤5 main sections, project/entity-centric products). The Designer chooses it and records
 * the choice in `.pumori/design/chosen.md`. Both read `SHELL_NAV`, so nothing else changes.
 */
export const APP_SHELL: ShellKind = 'sidebar';

export const ROUTE = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DEV_MAIL: '/dev/mail',
  DEV_UI: '/dev/ui',
  /** Dev-only full-page previews of each shell: `${DEV_UI_SHELLS}/sidebar`, `${DEV_UI_SHELLS}/topbar`. */
  DEV_UI_SHELLS: '/dev/ui/shells',
} as const;
