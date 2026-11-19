import { expect, test } from '@playwright/test';

test('pages are served with security headers', async ({ request }) => {
  const res = await request.get('/login');
  const headers = res.headers();

  expect(res.status()).toBe(200);
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
});

test('an unknown page shows the not-found page with a 404 status', async ({ page }) => {
  const res = await page.goto('/this-page-does-not-exist');

  expect(res?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
  await page.getByRole('link', { name: 'Go to the home page' }).click();
  await expect(page).toHaveURL(/\/login(\?.*)?$/);
});
