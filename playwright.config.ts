import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
	testDir: '.',
	testMatch: ['e2e/**/*.spec.ts', 'tests/**/*.spec.ts'],
	fullyParallel: false,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: 1,
	reporter: [['list']],
	use: {
		baseURL,
		trace: 'on-first-retry',
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
		},
	],
	webServer: {
		command: 'cross-env VITE_E2E_BYPASS_AUTH=true npm run dev -- --host 127.0.0.1 --port 5173',
		url: baseURL,
		reuseExistingServer: !process.env.CI,
		timeout: 120_000,
		env: { VITE_E2E_BYPASS_AUTH: 'true' },
	},
});
