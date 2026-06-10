/**
 * epic55MessagingAudit.test.ts — Epic 5.5 FCM / messaging matrix inventory guards
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd());
const MATRIX = join(ROOT, 'docs/FCM_AND_MESSAGING_MATRIX.md');
const DISPATCHER = join(ROOT, 'functions/dispatcher.js');
const NOTIFICATION_OPS = join(ROOT, 'functions/src/domains/notificationOps.js');
const INDEX = join(ROOT, 'functions/index.js');

describe('Epic 5.5 — FCM & messaging infra audit', () => {
	it('FCM_AND_MESSAGING_MATRIX inventory doc exists', () => {
		expect(existsSync(MATRIX)).toBe(true);
		const doc = readFileSync(MATRIX, 'utf8');
		expect(doc).toMatch(/device_tokens|fcm/i);
		expect(doc).toMatch(/team_broadcasts|messaging/i);
	});

	it('dispatcher.js defines role push preferences including registrar', () => {
		const src = readFileSync(DISPATCHER, 'utf8');
		expect(src).toMatch(/registrar:\s*true/);
		expect(src).toMatch(/push_weatherAlerts/);
	});

	it('notificationOps exports device token + broadcast triggers', () => {
		const ops = readFileSync(NOTIFICATION_OPS, 'utf8');
		expect(ops).toMatch(/registerDeviceToken/);
		expect(ops).toMatch(/onTeamBroadcastCreated/);
		const idx = readFileSync(INDEX, 'utf8');
		expect(idx).toMatch(/registerDeviceToken/);
	});
});
