import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The design system's own checks: no axe violations on the key screens, no horizontal scroll on a
// phone, and the dev-only UI gallery (/dev/ui) is a 404 in production builds (./verify --release).
const isProdBuild = process.env.E2E_WEB_MODE === 'prod';
const PHONE = { width: 390, height: 844 };

// `exclude`: CSS selectors to leave out, e.g. the gallery's framed shell previews: those are whole pages
// with their own landmarks (axe would flag them as duplicates of the gallery's) and are checked on their own.
const expectNoAxeViolations = async (page: Page, exclude: string[] = []) => {
  const builder = new AxeBuilder({ page });

  exclude.forEach((selector) => builder.exclude(selector));
  const { violations } = await builder.analyze();

  expect(violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length}) ${v.nodes.map((node) => node.target.join(' > ')).slice(0, 3).join(', ')}`)).toEqual([]);
};

const expectNoHorizontalScroll = async (page: Page) => {
  const overflow = await page.locator('html').evaluate((html) => html.scrollWidth - html.clientWidth);

  expect(overflow).toBeLessThanOrEqual(0);
};

const TOUCH_TARGET_PX = 44;

// On a phone every visible link and button in the shell's header is at least a 44 px tap target.
const expectHeaderTapTargets = async (page: Page) => {
  const heights = await page.locator('[data-slot="shell-header"]:visible').locator('a:visible, button:visible').evaluateAll((elements) => (
    elements.map((element) => `${element.textContent?.trim() || element.getAttribute('aria-label') || '?'}: ${Math.round(element.getBoundingClientRect().height)}`)
  ));
  const tooSmall = heights.filter((entry) => Number(entry.split(': ').pop()) < TOUCH_TARGET_PX);

  expect(heights.length).toBeGreaterThan(0);
  expect(tooSmall).toEqual([]);
};

// Checks the main navigation of whichever shell is on the page (`data-shell`): the sidebar opens in a
// sheet on a phone, the top bar shows its tabs in the header.
/** One main-nav item is marked current; `label` pins which (shell previews), else any (the product's home). */
const expectCurrentNavItem = async (page: Page, label?: string) => {
  const shell = await page.locator('[data-shell]').getAttribute('data-shell');

  if (shell === 'sidebar') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    const nav = page.getByRole('dialog');
    await (label
      ? expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
      : expect(nav.locator('a[aria-current="page"]')).toHaveCount(1));
    await page.keyboard.press('Escape');

    return;
  }
  const nav = page.getByRole('navigation', { name: 'Main' });
  await (label
    ? expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    : expect(nav.locator('a[aria-current="page"]')).toHaveCount(1));
};

for (const path of ['/login', '/signup']) {
  test(`${path} has no accessibility violations and fits a phone`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectNoAxeViolations(page);

    await page.setViewportSize(PHONE);
    await expectNoHorizontalScroll(page);
  });
}

test('the signed-in shell has no accessibility violations on desktop and phone', async ({ page }) => {
  const email = `ds-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

  await page.goto('/signup');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign up' }).click();
  // the signed-in home: whatever the product puts there has a page heading
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);

  await page.setViewportSize(PHONE);
  await expect(page.getByRole('button', { name: /^Account menu/ })).toBeVisible();
  await expectNoHorizontalScroll(page);
  await expectHeaderTapTargets(page);
  await expectNoAxeViolations(page);
  await expectCurrentNavItem(page);
});

// Dark mode follows the OS: the same screens must pass axe (contrast included) with prefers-color-scheme: dark.
test('login and the signed-in home have no accessibility violations in dark mode', async ({ page }) => {
  const email = `dark-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark');
  await expectNoAxeViolations(page);

  await page.goto('/signup');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery staple');
  await page.getByRole('button', { name: 'Sign up' }).click();
  // the signed-in home: whatever the product puts there has a page heading
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoAxeViolations(page);
});

// Both shells, whichever one APP_SHELL picks: the dev-only previews at /dev/ui/shells/<shell> render
// each one full-page with demo content (context switcher, stat cards, dense table, settings card).
for (const shell of ['sidebar', 'topbar'] as const) {
  test(`the ${shell} shell preview is accessible on desktop and phone`, async ({ page }) => {
    const res = await page.goto(`/dev/ui/shells/${shell}`);

    if (isProdBuild) {
      expect(res?.status()).toBe(404);

      return;
    }
    await expect(page.locator(`[data-shell="${shell}"]`)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Deployments' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Switch project/ }).first()).toBeAttached();
    await expectNoAxeViolations(page);

    await page.setViewportSize(PHONE);
    await expectNoHorizontalScroll(page);
    await expectHeaderTapTargets(page);
    await expectNoAxeViolations(page);
    await expectCurrentNavItem(page, 'Overview');
  });
}

test('the top bar shell keeps a sticky header with underline tabs', async ({ page }) => {
  const res = await page.goto('/dev/ui/shells/topbar');

  if (isProdBuild) {
    expect(res?.status()).toBe(404);

    return;
  }
  const tabs = page.getByRole('navigation', { name: 'Main' });

  await expect(tabs.getByRole('link')).toHaveText(['Overview', 'Deployments', 'Analytics', 'Settings']);
  await expect(page.locator('[data-slot="shell-header"]')).toHaveCSS('position', 'sticky');
  await page.mouse.wheel(0, 800);
  await expect(tabs).toBeInViewport();
});

test('the UI gallery is dev-only, accessible and fits a phone', async ({ page }) => {
  const res = await page.goto('/dev/ui');

  if (isProdBuild) {
    expect(res?.status()).toBe(404);

    return;
  }
  await expect(page.getByRole('heading', { name: 'UI gallery', level: 1 })).toBeVisible();
  await expect(page.locator('iframe[data-shell-preview]').first()).toBeVisible();
  await expect(page.getByRole('table', { name: 'Deployments' })).toBeVisible();
  await expectNoAxeViolations(page, ['iframe[data-shell-preview]']);

  await page.setViewportSize(PHONE);
  await expectNoHorizontalScroll(page);
});
