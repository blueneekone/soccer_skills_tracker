import { test, expect } from '@playwright/test';
import path from 'node:path';

const OUT_DIR = path.resolve('audit-artifacts/coach');

async function bypassCoachAuth(context: any) {
	await context.addInitScript(() => {
		window.localStorage.setItem(
			'auth_token',
			JSON.stringify({
				isAuthenticated: true,
				user: { uid: 'mock-coach-uid', email: 'coach-audit@sstracker.app', emailVerified: true }
			})
		);
		window.localStorage.setItem(
			'user_profile',
			JSON.stringify({
				isProfileComplete: true,
				role: 'coach',
				clubId: 'mock-club-123',
				teamId: 'mock-team-123',
				tenantId: 'mock-tenant-123'
			})
		);
		window.localStorage.setItem(
			'auth_state',
			JSON.stringify({
				role: 'coach',
				isProfileComplete: true,
				tenantId: 'mock-tenant-123',
				clubId: 'mock-club-123',
				teamId: 'mock-team-123',
				clearance: { status: 'cleared' }
			})
		);
	});
}

test.describe('Coach OS Functional & Visual Audit', () => {
	test('captures war room tactical canvas, drill-drag interaction, roster, and message modal', async ({ page, context }) => {
		await page.setViewportSize({ width: 1280, height: 900 });
		await bypassCoachAuth(context);

		// 1. War Room Tactical Canvas
		await page.goto('/coach/tactical');

		const pitchSvg = page.locator('#tactical-pitch');
		await expect(pitchSvg).toBeVisible({ timeout: 15000 });

		await page.screenshot({
			path: path.join(OUT_DIR, 'coach-war-room-tactical.png'),
			fullPage: true
		});

		// 2. Perform drill-drag interaction on the tactical canvas
		const token = page.locator('g.kinetic-disc-group').first();
		if (await token.isVisible()) {
			const box = await token.boundingBox();
			if (box) {
				await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
				await page.mouse.down();
				await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 50);
				await page.mouse.up();
			}
		}

		await page.screenshot({
			path: path.join(OUT_DIR, 'coach-drill-drag-interaction.png'),
			fullPage: true
		});

		// 3. Coach Logistics & Roster Panel
		await page.goto('/coach/logistics?tab=roster');

		// Take screenshot of roster panel
		await page.screenshot({
			path: path.join(OUT_DIR, 'coach-roster-panel.png'),
			fullPage: true
		});

		// 4. New Message Modal
		await page.goto('/coach/logistics?tab=comms');
		const newChatBtn = page.locator('button', { hasText: /new chat|new message|\+ message/i }).first();
		if (await newChatBtn.isVisible()) {
			await newChatBtn.click();
			const modal = page.locator('.nm-modal');
			if (await modal.isVisible({ timeout: 5000 })) {
				await page.screenshot({
					path: path.join(OUT_DIR, 'coach-new-message-modal.png')
				});
			}
		}
	});
});
