import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadAcquisitionPrintMeta } from '../acquisition/acquisitionPrintMeta.server.js';

describe('loadAcquisitionPrintMeta', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.VITE_COMMIT_SHA;
		delete process.env.COMMIT_SHA;
		delete process.env.VERCEL_GIT_COMMIT_SHA;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('returns buildDate formatted as YYYY-MM-DD and non-empty shortSha', () => {
		const meta = loadAcquisitionPrintMeta();
		expect(meta.buildDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(typeof meta.shortSha).toBe('string');
		expect(meta.shortSha.length).toBeGreaterThan(0);
	});

	it('prefers environment variable VITE_COMMIT_SHA over git execution', () => {
		process.env.VITE_COMMIT_SHA = '1234567890abcdef';
		const meta = loadAcquisitionPrintMeta();
		expect(meta.shortSha).toBe('1234567');
	});
});
