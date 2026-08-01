// playwright.config.js
// Optimized for SSTracker Svelte 5 + "Nuclear Americana Tech Noir" Bento Grid Regression Suite

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Directory where Playwright searches for test specifications
  testDir: './e2e',

  // Maximum time one test can run (30 seconds)
  timeout: 30 * 1000,

  expect: {
    // Maximum time expect() should wait for conditions (e.g. visual stability)
    timeout: 5000,
    
    // Configure threshold for visual pixel comparison (Visual Regression check)
    toHaveScreenshot: {
      maxDiffPixels: 100, // Strict threshold for 12-column alignment checks
      threshold: 0.2,     // Sensible color sensitivity gate to catch palette drift
    },
  },

  // Run tests in files in parallel to optimize execution speed
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only to catch transient rendering hydration or network drops
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI to preserve resources; utilize half-capacity locally
  workers: process.env.CI ? 1 : undefined,

  // Reporter selection: Line/List for TUI progress telemetry, HTML for full reports
  reporter: [
    ['list'], 
    ['html', { outputFolder: 'audit-artifacts/playwright-report', open: 'never' }],
    ['json', { outputFile: 'audit-artifacts/playwright-results.json' }]
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL of your local Svelte dev server
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying a failed test
    trace: 'on-first-retry',

    // Automatically record visual evidence to feed our CRO review folders
    screenshot: 'only-on-failure',
    video: {
      mode: 'retain-on-failure', // Keeps video recordings of failed visual layouts
      size: { width: 1280, height: 720 },
    },
  },

  // Configure projects for major responsive viewports to test our "Anti-Squish" fluid clamp layout physics
  projects: [
    {
      name: 'desktop-chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'tablet-portrait',
      use: {
        ...devices['iPad Mini'],
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: 'mobile-portrait',
      use: {
        ...devices['iPhone 14'],
        viewport: { width: 375, height: 812 },
      },
    },
  ],

  // Run your local Svelte development server before starting the test runner
  webServer: {
    command: 'npm run dev', // Or 'pnpm dev' based on your active package manager
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Allow plenty of time for Svelte 5 compilation on first boot
  },

  // Target directory for test outputs, screenshots, and visual trace logs
  outputDir: 'audit-artifacts/temp-results/',
});
