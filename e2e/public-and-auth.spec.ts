import { expect, test } from '@playwright/test';

test('public chat loads without authentication', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/PostIt AI/i);
  await expect(page.locator('textarea')).toBeVisible();
});

test('anonymous visitor is redirected away from the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  await expect(page.getByRole('button', { name: 'Masuk' })).toBeVisible();
});

test('health endpoint reports readiness without exposing internals', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: 'ok' });
});
