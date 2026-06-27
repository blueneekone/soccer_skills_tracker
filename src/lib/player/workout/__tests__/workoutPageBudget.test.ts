import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PROOF_IMAGE_MAX, PROOF_VIDEO_MAX, validateProofMediaFile } from '../workoutPageSubmit.js';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const WORKOUT_PAGE = join(ROOT, 'src/routes/(app)/player/workout/+page.svelte');
const BUDGET_SCRIPT = join(ROOT, 'scripts/check-file-budget.mjs');

const WORKOUT_PAGE_MAX = 1200;
const GRANDFATHER_CEILING = 1400;

describe('TRAIN-PAGE-BUDGET-FIX — workout +page.svelte line budget', () => {
	it('route +page.svelte exists', () => {
		expect(existsSync(WORKOUT_PAGE)).toBe(true);
	});

	it('+page.svelte is under 1200 lines (sprint target)', () => {
		const content = readFileSync(WORKOUT_PAGE, 'utf-8');
		const lineCount = content.split('\n').length;
		expect(lineCount).toBeLessThan(WORKOUT_PAGE_MAX);
	});

	it('grandfather ceiling for workout +page.svelte remains 1400 (not raised)', () => {
		const scriptSrc = readFileSync(BUDGET_SCRIPT, 'utf-8');
		expect(scriptSrc).toMatch(
			/src\/routes\/\(app\)\/player\/workout\/\+page\.svelte['"],\s*1400/,
		);
		const content = readFileSync(WORKOUT_PAGE, 'utf-8');
		const lineCount = content.split('\n').length;
		expect(lineCount).toBeLessThanOrEqual(GRANDFATHER_CEILING);
	});
});

describe('workoutPageSubmit — proof media validation', () => {
	it('rejects unsupported file types', () => {
		const file = new File(['x'], 'bad.txt', { type: 'text/plain' });
		expect(validateProofMediaFile(file)).toMatch(/images and video/);
	});

	it('rejects oversized images', () => {
		const file = new File([new Uint8Array(PROOF_IMAGE_MAX + 1)], 'big.jpg', {
			type: 'image/jpeg',
		});
		expect(validateProofMediaFile(file)).toMatch(/10 MB/);
	});

	it('rejects oversized videos', () => {
		const file = new File([new Uint8Array(PROOF_VIDEO_MAX + 1)], 'big.mp4', {
			type: 'video/mp4',
		});
		expect(validateProofMediaFile(file)).toMatch(/50 MB/);
	});

	it('accepts valid image files', () => {
		const file = new File(['x'], 'proof.jpg', { type: 'image/jpeg' });
		expect(validateProofMediaFile(file)).toBeNull();
	});
});
