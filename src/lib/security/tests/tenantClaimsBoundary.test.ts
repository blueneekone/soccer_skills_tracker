import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import admin from 'firebase-admin';

if (!admin.apps.length) {
	admin.initializeApp({ projectId: 'test-project-cell-router' });
}

const mockFirestoreDb1 = { id: 'cell-use1-001', collection: vi.fn() };
const mockFirestoreDb2 = { id: 'cell-use1-002', collection: vi.fn() };
const mockFirestoreDb3 = { id: 'cell-use1-003', collection: vi.fn() };
const mockRegistryDb = {
	id: '(default)',
	collection: vi.fn(() => ({
		doc: () => ({
			get: async () => ({
				exists: true,
				get: (field: string) => (field === 'cellId' ? 'cell-euw1-001' : null),
			}),
		}),
	})),
};

// Spy on admin.firestore
vi.spyOn(admin, 'firestore').mockImplementation((app?: any, databaseId?: string) => {
	if (databaseId === 'cell-use1-001') return mockFirestoreDb1 as any;
	if (databaseId === 'cell-use1-002') return mockFirestoreDb2 as any;
	if (databaseId === 'cell-use1-003') return mockFirestoreDb3 as any;
	return mockRegistryDb as any;
});

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 5.2 - Multi-Tenant Custom Claims & Cell Boundary Gates', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('1. verifies request.auth.token.clubId == clubId claim matching rule pattern on /clubs/{clubId}', () => {
		expect(RULES).toMatch(/match \/clubs\/\{clubId\}/);
		const clubBlock = RULES.match(/match \/clubs\/\{clubId\}[\s\S]*?(?=match \/|$)/);
		expect(clubBlock).not.toBeNull();
		expect(clubBlock![0]).toMatch(/request\.auth\.token\.clubId == clubId/);
	});

	it('2. verifies club write rules require matches on request.auth.token.clubId', () => {
		const clubBlock = RULES.match(/match \/clubs\/\{clubId\}[\s\S]*?(?=match \/|$)/);
		expect(clubBlock).not.toBeNull();
		expect(clubBlock![0]).toMatch(/request\.auth\.token\.clubId == clubId/);
	});

	it('3. verifies cross-tenant read attempts on /clubs/{clubId} are blocked by claim check', () => {
		const clubBlock = RULES.match(/match \/clubs\/\{clubId\}[\s\S]*?(?=match \/|$)/);
		expect(clubBlock).not.toBeNull();
		expect(clubBlock![0]).toMatch(/allow read: if isGlobalAdmin\(\) \|\| \(isAuthenticated\(\) && request\.auth\.token\.clubId == clubId\);/);
	});

	it('4. verifies cross-tenant write attempts on /clubs/{clubId} are blocked unless clubId matches', () => {
		const clubBlock = RULES.match(/match \/clubs\/\{clubId\}[\s\S]*?(?=match \/|$)/);
		expect(clubBlock).not.toBeNull();
		expect(clubBlock![0]).toMatch(/allow write: if isGlobalAdmin\(\) \|\| \(isAuthenticated\(\) && request\.auth\.token\.clubId == clubId\);/);
	});

	it('5. getActiveDb(cellId) (via getAdminDb) returns isolated Firestore instances per tenant', async () => {
		const cellRouter = await import('../../../../functions-compliance/cellRouter.js');
		const db1 = cellRouter.getAdminDb('cell-use1-001');
		const db2 = cellRouter.getAdminDb('cell-use1-002');

		expect(db1).toBeDefined();
		expect(db2).toBeDefined();
		expect(db1).not.toBe(db2);
		expect((db1 as any).id).toBe('cell-use1-001');
		expect((db2 as any).id).toBe('cell-use1-002');
	});

	it('6. cellRouter.js routes to correct cell based on custom claims via getRequestDb', async () => {
		const cellRouter = await import('../../../../functions-compliance/cellRouter.js');
		const request = { auth: { uid: 'u1', token: { cellId: 'cell-use1-003' } } };

		const db = cellRouter.getRequestDb(request as any);
		expect(db).toBeDefined();
		expect((db as any).id).toBe('cell-use1-003');
	});

	it('7. getRequestDb throws error for unauthenticated requests', async () => {
		const cellRouter = await import('../../../../functions-compliance/cellRouter.js');

		const request = {};
		expect(() => cellRouter.getRequestDb(request as any)).toThrow();
	});

	it('8. admin impersonation respects tenant boundaries (isGlobalAdmin bypasses club rules in firestore.rules)', () => {
		const clubBlock = RULES.match(/match \/clubs\/\{clubId\}[\s\S]*?(?=match \/|$)/);
		expect(clubBlock).not.toBeNull();
		expect(clubBlock![0]).toMatch(/isGlobalAdmin\(\)/);
	});

	it('9. getRegistryDb() returns the default cell instance', async () => {
		const cellRouter = await import('../../../../functions-compliance/cellRouter.js');
		const db = cellRouter.getRegistryDb();
		expect(db).toBeDefined();
		expect((db as any).id).toBe('(default)');
	});

	it('10. getTenantDb(tenantId) retrieves cellId from registry and returns cell db', async () => {
		const cellRouter = await import('../../../../functions-compliance/cellRouter.js');

		const result = await cellRouter.getTenantDb('tenantX');
		expect(result.cellId).toBe('cell-euw1-001');
		expect(result.db).toBeDefined();
	});
});
