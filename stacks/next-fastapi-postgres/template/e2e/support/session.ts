import type { Page } from '@playwright/test';

/**
 * Page helpers: the ONE place that knows how to reach things in the UI (labels, routes, menus). Specs call these
 * and keep their own assertions, so when a screen moves, only the helper changes. Helpers are not protected
 * tests: the task that changes the UI updates them, and the reviewer checks the diff. No `expect` here (lint).
 */
export const uniqueTestEmail = (): string => `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;

export const signUp = async (page: Page, email: string, password = 'correct horse battery staple'): Promise<void> => {
  await page.goto('/signup');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();
};

export const openAccountMenu = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /^Account menu/ }).click();
};
