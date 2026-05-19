import { test, expect } from '@playwright/test';
import path from 'node:path';

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

test.describe('Player OS dashboard — Sprint 1.4 smoke', () => {
	test.use(storageState ? { storageState } : {});

	test.beforeEach(async ({ page }, testInfo) => {
		if (storageState) return;

		if (!hasOperativeLogin) {
			testInfo.skip(
				true,
				'Set E2E_STORAGE_STATE or E2E_PLAYER_CALLSIGN + E2E_PLAYER_OTP for authenticated smoke',
			);
			return;
		}

		await page.goto('/login');
		await page.getByRole('button', { name: /initialize operative/i }).click();
		await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN!);
		await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP!);
		await page.getByRole('button', { name: /authorize clearance/i }).click();
		await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
	});

	test('shows Vanguard Protocol PAC and no legacy Tactical ops', async ({ page }) => {
		await page.goto('/player/dashboard');
		await expect(page.getByRole('heading', { name: /core attributes/i })).toBeVisible({
			timeout: 30_000,
		});
		await expect(page.getByText('PAC', { exact: true }).first()).toBeVisible();
		await expect(page.getByText(/tactical ops/i)).toHaveCount(0);
		await expect(page.getByText(/mission log/i)).toHaveCount(0);
	});
});
