import { expect, test } from '@playwright/test';

test('demo app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kanvaskit' })).toBeVisible();
});

test('editor mounts a single canvas', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-kanvaskit-canvas] .canvas-container')).toHaveCount(1);
});
