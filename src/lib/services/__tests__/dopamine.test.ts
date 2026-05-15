/**
 * dopamine.test.ts
 * ─────────────────
 * Unit tests for the Phase 4, Epic 7 Dopamine Engine.
 *
 * Covers:
 *   dopamineOnCommit  — online path, offline-defer path, committed=false path
 *   dopamineOnCallable — resolve path, reject path
 *   Kill switches     — vanguardFlags.dopamineEnabled=false, prefers-reduced-motion
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock variables ────────────────────────────────────────────────────
// vi.hoisted() runs before vi.mock() factory evaluation, making these
// variables available inside the factory callbacks (which are hoisted to the
// top of the file by vitest's transform).
const { mockConfetti, mockFlags } = vi.hoisted(() => {
	const mockConfetti = vi.fn().mockResolvedValue(undefined);
	const mockFlags = { dopamineEnabled: true };
	return { mockConfetti, mockFlags };
});

vi.mock('canvas-confetti', () => ({ default: mockConfetti }));

vi.mock('$lib/services/remoteConfig.svelte.js', () => ({
	vanguardFlags: mockFlags,
}));

// ── SvelteKit $app/environment stub ──────────────────────────────────────────
vi.mock('$app/environment', () => ({ browser: true }));

// ── Import the module under test after mocks are declared ─────────────────────
import {
	dopamineExplosion,
	dopamineOnCommit,
	dopamineOnCallable,
} from '$lib/services/dopamine.svelte.js';
import type { BatchWriteResult } from '$lib/services/writes.types';

// ── Async drain helper ────────────────────────────────────────────────────────
// dopamineExplosion is fired with `void` (untracked promise) and internally
// has `await import('canvas-confetti')`.  A single Promise.resolve() tick is
// not enough to flush that floating promise chain.  Yielding via setTimeout(0)
// ensures all pending microtasks and the lazy-import chain have completed.
const flushAsync = () => new Promise<void>((r) => setTimeout(r, 0));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<BatchWriteResult> = {}): BatchWriteResult {
	return {
		committed: true,
		batchId: 'test-batch-id',
		offlineQueued: false,
		...overrides,
	};
}

function resolvedResult(overrides?: Partial<BatchWriteResult>): Promise<BatchWriteResult> {
	return Promise.resolve(makeResult(overrides));
}

// ── Test suite ─────────────────────────────────────────────────────────────────

describe('Dopamine Engine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockFlags.dopamineEnabled = true;

		// Default: no reduced-motion preference
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			configurable: true,
			value: vi.fn().mockReturnValue({ matches: false }),
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── dopamineOnCommit — online path ─────────────────────────────────────────

	describe('dopamineOnCommit (online path)', () => {
		it('fires confetti immediately when committed=true and offlineQueued=false', async () => {
			await dopamineOnCommit(resolvedResult({ offlineQueued: false }), { kind: 'drill' });
			await flushAsync();
			expect(mockConfetti).toHaveBeenCalledTimes(1);
			const callArg = mockConfetti.mock.calls[0][0] as Record<string, unknown>;
			expect(callArg.colors).toContain('#14b8a6');
		});

		it('returns the BatchWriteResult unchanged', async () => {
			const input = makeResult({ batchId: 'my-id' });
			const result = await dopamineOnCommit(Promise.resolve(input), { kind: 'drill' });
			await flushAsync();
			expect(result).toEqual(input);
		});
	});

	// ── dopamineOnCommit — offline-defer path ─────────────────────────────────

	describe('dopamineOnCommit (offline-defer path)', () => {
		it('does NOT fire confetti immediately when offlineQueued=true', async () => {
			await dopamineOnCommit(resolvedResult({ offlineQueued: true }), { kind: 'drill' });
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});

		it('fires confetti exactly once when vanguard:sync-complete is dispatched', async () => {
			await dopamineOnCommit(resolvedResult({ offlineQueued: true }), { kind: 'drill' });
			await flushAsync();

			window.dispatchEvent(new CustomEvent('vanguard:sync-complete'));
			await flushAsync();

			expect(mockConfetti).toHaveBeenCalledTimes(1);
		});

		it('does NOT fire a second time when vanguard:sync-complete fires again', async () => {
			await dopamineOnCommit(resolvedResult({ offlineQueued: true }), { kind: 'drill' });
			await flushAsync();

			// First dispatch → fires once
			window.dispatchEvent(new CustomEvent('vanguard:sync-complete'));
			await flushAsync();
			// Second dispatch → listener was { once: true }, should NOT fire again
			window.dispatchEvent(new CustomEvent('vanguard:sync-complete'));
			await flushAsync();

			expect(mockConfetti).toHaveBeenCalledTimes(1);
		});
	});

	// ── dopamineOnCommit — committed=false path ───────────────────────────────

	describe('dopamineOnCommit (committed=false)', () => {
		it('never calls confetti when committed=false', async () => {
			await dopamineOnCommit(resolvedResult({ committed: false }), { kind: 'drill' });
			await flushAsync();
			window.dispatchEvent(new CustomEvent('vanguard:sync-complete'));
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});
	});

	// ── dopamineOnCallable ─────────────────────────────────────────────────────

	describe('dopamineOnCallable', () => {
		it('fires confetti once when the callable resolves', async () => {
			const payload = { earnedXP: 100 };
			const result = await dopamineOnCallable(Promise.resolve(payload), { kind: 'drill' });
			await flushAsync();
			expect(result).toEqual(payload);
			expect(mockConfetti).toHaveBeenCalledTimes(1);
		});

		it('does NOT fire confetti when the callable rejects', async () => {
			await expect(
				dopamineOnCallable(Promise.reject(new Error('CF_ERROR')), { kind: 'drill' }),
			).rejects.toThrow('CF_ERROR');
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});

		it('returns the callable result unchanged', async () => {
			const data = { level: 5 };
			const result = await dopamineOnCallable(Promise.resolve(data), { kind: 'grit' });
			await flushAsync();
			expect(result).toEqual(data);
		});
	});

	// ── Kill switch: dopamineEnabled=false ────────────────────────────────────

	describe('kill switch — dopamineEnabled=false', () => {
		beforeEach(() => {
			mockFlags.dopamineEnabled = false;
		});

		it('dopamineOnCommit: no confetti on online path', async () => {
			await dopamineOnCommit(resolvedResult(), { kind: 'drill' });
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});

		it('dopamineOnCallable: no confetti on resolve', async () => {
			await dopamineOnCallable(Promise.resolve({}), { kind: 'levelUp' });
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});

		it('dopamineExplosion: no confetti', async () => {
			await dopamineExplosion('matchWin');
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});
	});

	// ── Kill switch: prefers-reduced-motion ───────────────────────────────────

	describe('kill switch — prefers-reduced-motion', () => {
		beforeEach(() => {
			Object.defineProperty(window, 'matchMedia', {
				writable: true,
				configurable: true,
				value: vi.fn().mockReturnValue({ matches: true }),
			});
		});

		it('dopamineOnCommit: no confetti on online path', async () => {
			await dopamineOnCommit(resolvedResult(), { kind: 'grit' });
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});

		it('dopamineOnCallable: no confetti on resolve', async () => {
			await dopamineOnCallable(Promise.resolve({}), { kind: 'drill' });
			await flushAsync();
			expect(mockConfetti).not.toHaveBeenCalled();
		});
	});

	// ── Preset palette verification ───────────────────────────────────────────

	describe('preset palette', () => {
		it('grit preset uses magenta/violet palette', async () => {
			await dopamineOnCommit(resolvedResult(), { kind: 'grit' });
			await flushAsync();
			const callArg = mockConfetti.mock.calls[0][0] as Record<string, unknown>;
			expect((callArg.colors as string[]).some((c) => c.includes('9d00ff') || c.includes('c084fc'))).toBe(true);
		});

		it('levelUp preset uses gold palette', async () => {
			await dopamineExplosion('levelUp');
			await flushAsync();
			const callArg = mockConfetti.mock.calls[0][0] as Record<string, unknown>;
			expect((callArg.colors as string[]).some((c) => c.includes('f0a500') || c.includes('fbbf24'))).toBe(true);
		});

		it('matchWin preset uses emerald/green palette', async () => {
			await dopamineExplosion('matchWin');
			await flushAsync();
			const callArg = mockConfetti.mock.calls[0][0] as Record<string, unknown>;
			expect((callArg.colors as string[]).some((c) => c.includes('10b981') || c.includes('34d399'))).toBe(true);
		});
	});
});
