import { expect, test } from '@playwright/test';

// Baseline tests check behaviour every product keeps (sign up, see who you are, log out, log in), not
// placeholder copy or routes a product is expected to change: the login URL may carry ?next=, and the
// signed-in home may live at any path.
const LOGIN_URL = /\/login(\?.*)?$/;
const SIGNED_IN_URL = /^(?!.*\/(login|signup)(\?|$)).*$/;

test('signup → account menu shows email → logout → login', async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const password = 'correct horse battery staple';

  await page.goto('/');
  await expect(page).toHaveURL(LOGIN_URL);

  await page.getByRole('link', { name: 'Create an account' }).click();
  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page).toHaveURL(SIGNED_IN_URL);

  // The account menu of the app shell (sidebar footer, or the top bar) shows who is signed in and logs out.
  await page.getByRole('button', { name: /^Account menu/ }).click();
  await expect(page.getByRole('menu')).toContainText(email);
  await page.getByRole('menuitem', { name: 'Log out' }).click();
  await expect(page).toHaveURL(LOGIN_URL);

  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('wrong password');
  await page.getByRole('button', { name: 'Log in' }).click();
  // Scope alerts to the form: Next.js also renders a role=alert route announcer.
  await expect(page.getByRole('form', { name: 'Log in' }).getByRole('alert')).toHaveText('Invalid email or password');

  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page).toHaveURL(SIGNED_IN_URL);
  await page.getByRole('button', { name: /^Account menu/ }).click();
  await expect(page.getByRole('menu')).toContainText(email);
});
