import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const storageState = process.env.E2E_STORAGE_STATE
	? path.resolve(process.env.E2E_STORAGE_STATE)
	: fs.existsSync(path.resolve('e2e/.auth/player.json'))
		? path.resolve('e2e/.auth/player.json')
		: undefined;

const hasOperativeLogin =
	Boolean(process.env.E2E_PLAYER_CALLSIGN?.trim()) && Boolean(process.env.E2E_PLAYER_OTP?.trim());

const HANDOFF_KEY = 'player_mission_handoff_v1';
const QUEST_PROGRESS_KEY = 'player_quest_progress_v1';

const SAMPLE_HANDOFF = {
	missionId: 'e2e-intent-6k',
	source: 'coach_intent',
	targetAttributeId: 'ball_mastery',
	requiredXp: 500,
	drillTitle: 'Cone Dribbling',
	durationMinutes: 25,
	targetRpe: 6,
	focusArea: 'technical',
	stashedAt: Date.now(),
};

async function loginPlayer(page: import('@playwright/test').Page) {
	await page.goto('/login');
	await page.getByRole('button', { name: /initialize operative/i }).click();
	await page.locator('#op-callsign').fill(process.env.E2E_PLAYER_CALLSIGN!);
	await page.locator('#op-code-otp').fill(process.env.E2E_PLAYER_OTP!);
	await page.getByRole('button', { name: /authorize clearance/i }).click();
	await page.waitForURL(/\/player\/dashboard/, { timeout: 60_000 });
}

function readQuestProgress(page: import('@playwright/test').Page) {
	return page.evaluate((key) => {
		try {
			return JSON.parse(sessionStorage.getItem(key) ?? '{}');
		} catch {
			return {};
		}
	}, QUEST_PROGRESS_KEY);
}

test.describe('Sprint 2.22 slice 6k — Coach mission HQ → Train handoff', () => {
	test.use(storageState ? { storageState } : {});

	test.beforeEach(async ({ page }, testInfo) => {
		if (storageState) return;

		if (!hasOperativeLogin) {
			testInfo.skip(
				true,
				'Set E2E_STORAGE_STATE or E2E_PLAYER_CALLSIGN + E2E_PLAYER_OTP (or e2e/.auth/player.json)',
			);
			return;
		}

		await loginPlayer(page);
	});

	test('Train applies session handoff and shows armed mission banner', async ({ page }) => {
		await page.addInitScript(
			({ key, handoff }) => {
				sessionStorage.setItem(key, JSON.stringify(handoff));
			},
			{ key: HANDOFF_KEY, handoff: SAMPLE_HANDOFF },
		);

		await page.goto('/player/workout');
		await expect(page.getByRole('heading', { name: 'Workout logger' }).first()).toBeVisible({
			timeout: 30_000,
		});

		await expect(page.locator('.pw-mission-armed')).toBeVisible();
		await expect(page.getByText(/Coach sets the goal/i)).toBeVisible();
		await expect(page.getByText(/Ball Mastery/i).first()).toBeVisible();
		await expect(page.getByText(/Suggested: Cone Dribbling/i)).toBeVisible();
		await expect(page.getByRole('button', { name: /Cone Dribbling/i })).toHaveClass(/pw-chip--on/);
		await expect(page.getByText(/ARMED: BALL MASTERY/i)).toBeVisible();
	});

	test('Free log clears armed mission and session handoff', async ({ page }) => {
		await page.addInitScript(
			({ key, handoff }) => {
				sessionStorage.setItem(key, JSON.stringify(handoff));
			},
			{ key: HANDOFF_KEY, handoff: SAMPLE_HANDOFF },
		);

		await page.goto('/player/workout');
		await expect(page.locator('.pw-mission-armed')).toBeVisible({ timeout: 30_000 });

		await page.getByRole('button', { name: /free log instead/i }).click();
		await expect(page.locator('.pw-mission-armed')).toHaveCount(0);
		await expect(page.getByText(/READY TO TRANSMIT/i)).toBeVisible();

		const handoffRaw = await page.evaluate((key) => sessionStorage.getItem(key), HANDOFF_KEY);
		expect(handoffRaw).toBeNull();
	});

	test('Start session defers quest completion until after log', async ({ page }) => {
		await page.goto('/player/dashboard');
		await expect(page.getByRole('group', { name: 'Operative identity card' })).toBeVisible({
			timeout: 30_000,
		});

		const missionRail = page.getByRole('region', { name: 'Quest log' });
		await expect(missionRail).toBeVisible();

		const startSessionBtn = missionRail.getByRole('button', { name: /start session/i }).first();
		const acceptBtn = missionRail.getByRole('button', { name: /accept/i }).first();

		let questId: string | null = null;

		if (await acceptBtn.isVisible().catch(() => false)) {
			await acceptBtn.click();
			await page.waitForTimeout(300);
		}

		if (!(await startSessionBtn.isVisible().catch(() => false))) {
			test.skip(true, 'No Start session mission on HQ — deploy a coach intent or accept daily habit first');
		}

		const progressBefore = (await readQuestProgress(page)) as {
			acceptedIds?: string[];
			completedIds?: string[];
		};

		await startSessionBtn.click();
		await page.waitForURL(/\/player\/workout/, { timeout: 15_000 });

		const progressAfterNav = (await readQuestProgress(page)) as {
			acceptedIds?: string[];
			completedIds?: string[];
		};

		const handoffRaw = await page.evaluate((key) => sessionStorage.getItem(key), HANDOFF_KEY);
		expect(handoffRaw).toBeTruthy();

		// 6k: navigating to Train must NOT prematurely mark completedIds (Claim before log).
		const completedBeforeLog = progressAfterNav.completedIds ?? [];
		for (const id of completedBeforeLog) {
			if (progressBefore.completedIds?.includes(id)) continue;
			// New completions on navigation would indicate premature claim readiness.
			expect(
				completedBeforeLog,
				`Quest ${id} should not move to completed before workout log`,
			).not.toContain(id);
		}

		questId = progressAfterNav.acceptedIds?.find((id) => id !== 'daily-streak-check') ?? null;
		if (questId) {
			expect(completedBeforeLog).not.toContain(questId);
		}

		await expect(page.locator('.pw-mission-armed, .pw-hq-link').first()).toBeVisible();
	});

	test('unarmed Train shows HQ link when coach intents exist', async ({ page }) => {
		await page.goto('/player/workout');
		await expect(page.getByRole('heading', { name: 'Workout logger' }).first()).toBeVisible({
			timeout: 30_000,
		});

		// If player has active team_assignments, link should appear when not armed.
		const hqLink = page.getByRole('link', { name: /Coach missions on HQ/i });
		const armed = page.locator('.pw-mission-armed');
		if (await armed.isVisible().catch(() => false)) {
			await expect(hqLink).toHaveCount(0);
		} else if (await hqLink.isVisible().catch(() => false)) {
			await expect(hqLink).toHaveAttribute('href', /\/player\/dashboard/);
		}
	});
});
