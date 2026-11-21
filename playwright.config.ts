import { defineConfig, devices } from '@playwright/test';

const mPort = 4173;
const mBaseUrl = `http://127.0.0.1:${String(mPort)}`;
const mExecutablePath = process.env.PW_CHROMIUM_EXECUTABLE;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: mBaseUrl,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(mExecutablePath ? { launchOptions: { executablePath: mExecutablePath } } : {}),
      },
    },
  ],
  webServer: {
    command: `pnpm exec vite build && pnpm exec vite preview --port ${String(mPort)} --strictPort --host 127.0.0.1`,
    url: mBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
