import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WRITES_RMW_FLAGS } from '$lib/services/writesAudit.js';

const WRITES = join(__dirname, '..', 'writes.svelte.ts');

describe('writes.svelte.ts audit (Phase C)', () => {
	it('does not import standalone updateDoc or setDoc from firebase/firestore', () => {
		const src = readFileSync(WRITES, 'utf-8');
		const firestoreImport = src.match(/import\s*\{[\s\S]*?\}\s*from 'firebase\/firestore';/)?.[0] ?? '';
		expect(firestoreImport).not.toMatch(/\bupdateDoc\b/);
		expect(firestoreImport).not.toMatch(/\bsetDoc\b/);
		expect(src).toMatch(/\bincrement\b/);
		expect(src).toMatch(/\bwriteBatch\b/);
		expect(src).toMatch(/\bbatch\.(set|update)\(/);
	});

	it('documents read-modify-write patterns flagged for architect review', () => {
		expect(WRITES_RMW_FLAGS.length).toBeGreaterThan(0);
		const grit = WRITES_RMW_FLAGS.find((f) => f.id === 'grit-daily-cap');
		expect(grit?.status).toBe('resolved');
		expect(grit?.pattern).toBe('read-modify-write');
	});
});
