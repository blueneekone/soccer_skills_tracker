import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // B815 Hydration & Svelte 5 Strictness Enforced
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  
  // ⚙️ CRITICAL: Use 'blob' reporter in CI for automated sharding and merging
  reporter: process.env.CI ? 'blob' : 'html',
  
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});