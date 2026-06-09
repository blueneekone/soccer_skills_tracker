/**
 * fcmTokenStore.test.ts — T0-9 FCM single-store convergence guard
 *
 * Asserts that ALL FCM token registration and dispatch is unified on
 * device_tokens/{uid} — no split store, no silent drop.
 *
 * Registration: messaging.svelte.ts -> registerDeviceToken callable -> device_tokens/{uid}
 * Dispatch:     dispatcher.js -> device_tokens/{uid} (same as notificationOps)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const MESSAGING = join(__dirname, '..', 'messaging.svelte.ts');
// Functions root is 4 levels up from src/lib/services/__tests__
const FUNCTIONS_ROOT = join(__dirname, '..', '..', '..', '..', 'functions');
const DISPATCHER = join(FUNCTIONS_ROOT, 'dispatcher.js');

describe('T0-9 FCM single-store convergence (device_tokens)', () => {
	// ── messaging.svelte.ts ────────────────────────────────────────────────────

	it('messaging.svelte.ts does NOT write fcmTokens to the users collection', () => {
		const src = readFileSync(MESSAGING, 'utf-8');
		// Old split-store writes — must be absent
		expect(src).not.toMatch(/fcmTokens\s*:\s*arrayUnion/);
		expect(src).not.toMatch(/fcmTokens\s*:\s*arrayRemove/);
	});

	it('messaging.svelte.ts routes registration through the registerDeviceToken callable', () => {
		const src = readFileSync(MESSAGING, 'utf-8');
		expect(src).toMatch(/registerDeviceToken/);
		expect(src).toMatch(/httpsCallable/);
	});

	it('messaging.svelte.ts deregister targets device_tokens collection', () => {
		const src = readFileSync(MESSAGING, 'utf-8');
		expect(src).toMatch(/device_tokens/);
	});

	// ── dispatcher.js ─────────────────────────────────────────────────────────

	it('dispatcher.js does NOT read tokens from userData.fcmTokens', () => {
		const src = readFileSync(DISPATCHER, 'utf-8');
		expect(src).not.toMatch(/userData\.fcmTokens/);
	});

	it('dispatcher.js reads tokens from device_tokens/{uid}', () => {
		const src = readFileSync(DISPATCHER, 'utf-8');
		expect(src).toMatch(/device_tokens\/\$\{uid\}/);
	});

	it('dispatcher.js resolves uid from email via admin.auth().getUserByEmail', () => {
		const src = readFileSync(DISPATCHER, 'utf-8');
		expect(src).toMatch(/getUserByEmail\(userEmail\)/);
	});

	it('dispatcher.js dead-token pruning targets device_tokens, not users.fcmTokens', () => {
		const src = readFileSync(DISPATCHER, 'utf-8');
		// staleTokens pruning must write to device_tokens, not users
		// Check the specific update call pattern on each line individually
		const updateLines = src.split('\n').filter((l) => l.includes('.update('));
		// No update call should target the users collection with fcmTokens
		for (const line of updateLines) {
			expect(line).not.toMatch(/users.*fcmTokens/);
		}
		// At least one update targets device_tokens
		expect(updateLines.some((l) => l.includes('device_tokens'))).toBe(true);
	});
});
