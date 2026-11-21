import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

const mExecutablePath = process.env.PW_CHROMIUM_EXECUTABLE;

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      exclude: ['tests/e2e/**', 'node_modules/**'],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright({
          launchOptions: {
            ...(mExecutablePath ? { executablePath: mExecutablePath } : {}),
          },
        }),
        instances: [{ browser: 'chromium' }],
      },
    },
  }),
);
