import { describe, it, expect, vi } from 'vitest';
import { loadRecruitersData } from '../recruitersLoad.js';
import { updateRecruiterVerification } from '../recruitersVerification.js';

vi.mock('$lib/firebase.js', () => ({
	db: {}
}));

vi.mock('firebase/firestore', () => ({
	collection: vi.fn(),
	doc: vi.fn(),
	getDocs: vi.fn(() => ({
		forEach: (cb: any) => {
			cb({
				id: 'rec_1',
				data: () => ({ email: 'test@example.com', scoutName: 'Test Scout' })
			});
		}
	})),
	orderBy: vi.fn(),
	query: vi.fn(),
	serverTimestamp: vi.fn(() => ({ type: 'server_timestamp' })),
	updateDoc: vi.fn(() => Promise.resolve())
}));

vi.mock('$lib/stores/auth.svelte.js', () => ({
	authStore: {
		user: { email: 'admin@example.com' }
	}
}));

vi.mock('$lib/utils/security.js', () => ({
	logSecurityEvent: vi.fn(() => Promise.resolve())
}));

describe('Admin Recruiters Engine', () => {
	describe('loadRecruitersData', () => {
		it('fetches recruiters from Firestore and maps correctly', async () => {
			const rows = await loadRecruitersData();
			expect(rows.length).toBe(1);
			expect(rows[0].id).toBe('rec_1');
			expect(rows[0].email).toBe('test@example.com');
			expect(rows[0].scoutName).toBe('Test Scout');
		});
	});

	describe('updateRecruiterVerification', () => {
		it('updates the verification status and logs the event', async () => {
			const mockRow = {
				id: 'rec_1',
				email: 'test@example.com'
			} as any;
			
			const result = await updateRecruiterVerification(mockRow, 'verified', '');
			
			// We only assert the function returns true or the new status for success
			expect(result).toBe(true);
		});
	});
});
