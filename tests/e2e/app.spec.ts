import { expect, test } from '@playwright/test';

test('demo app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Kanvaskit' })).toBeVisible();
});
