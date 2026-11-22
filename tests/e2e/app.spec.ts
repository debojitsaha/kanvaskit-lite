import { expect, test } from '@playwright/test';

test('demo app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kanvaskit' })).toBeVisible();
});

test('editor mounts a single canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-kanvaskit-canvas] .canvas-container')).toHaveCount(1);
});

test('toolbar adds a rectangle without errors', async ({ page }) => {
  await page.goto('/');
  const zoomLabel = page.getByText(/^\d+%$/);
  await expect(zoomLabel).toHaveText(/\d+%/);
  await page.getByRole('button', { name: 'Add rectangle' }).click();
  await expect(zoomLabel).toHaveText(/\d+%/);
  await expect(page.getByRole('status')).toHaveCount(0);
});
