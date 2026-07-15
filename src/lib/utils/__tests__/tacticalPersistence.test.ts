import { describe, it, expect, vi } from 'vitest';
import { saveTacticalCanvas } from '../tacticalPersistence.js';

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

vi.mock('firebase/firestore', () => ({
	doc: vi.fn(),
	updateDoc: vi.fn(() => Promise.resolve())
}));

describe('saveTacticalCanvas', () => {
	it('saves correctly', async () => {
		await expect(saveTacticalCanvas('club1', 'fac1', '{}')).resolves.toBeUndefined();
	});

	it('throws on missing args', async () => {
		await expect(saveTacticalCanvas('', 'fac1', '{}')).rejects.toThrow();
	});
});
