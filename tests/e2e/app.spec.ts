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

test('layers panel lists objects and Delete removes the selected one', async ({ page }) => {
  await page.goto('/');
  const layers = page.getByRole('complementary', { name: 'Layers' });
  await page.getByRole('button', { name: 'Add rectangle' }).click();
  await page.getByRole('button', { name: 'Add ellipse' }).click();
  await expect(layers.locator('li')).toHaveCount(2);
  await page.keyboard.press('Delete');
  await expect(layers.locator('li')).toHaveCount(1);
});

test('Export PNG downloads kanvaskit.png', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Export PNG' })).toBeEnabled();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export PNG' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('kanvaskit.png');
});

test('saved JSON reopens with the same layers', async ({ page }) => {
  await page.goto('/');
  const layers = page.getByRole('complementary', { name: 'Layers' });
  await page.getByRole('button', { name: 'Add rectangle' }).click();
  await page.getByRole('button', { name: 'Add text' }).click();
  await expect(layers.locator('li')).toHaveCount(2);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('kanvaskit.json');
  const savedPath = test.info().outputPath('kanvaskit.json');
  await download.saveAs(savedPath);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Save JSON' })).toBeEnabled();
  await expect(layers.locator('li')).toHaveCount(0);
  await page.locator('input[type=file][accept*="json"]').setInputFiles(savedPath);
  await expect(layers.locator('li')).toHaveCount(2);
});

test('shows website and Pro waitlist links in the header', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Website' })).toHaveAttribute(
    'href',
    'https://kanvaskit.netlify.app',
  );
  await expect(page.getByRole('link', { name: 'Pro waitlist' })).toHaveAttribute(
    'href',
    'https://tally.so/r/kbNOgR',
  );
});
