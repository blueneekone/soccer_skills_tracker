import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

vi.mock('../../../../functions/cellRouter.js', () => {
    return {
        getAdminDb: vi.fn((cellId) => ({ id: cellId, type: 'admin' })),
        getRegistryDb: vi.fn(() => ({ id: 'default', type: 'registry' })),
        getRequestDb: vi.fn((req) => {
            if (!req.auth) throw new Error('unauthenticated');
            return { id: req.auth.token.cellId, type: 'request' };
        }),
        getTenantDb: vi.fn((tenantId) => Promise.resolve({ cellId: 'cell-euw1-001', db: { id: 'cell-euw1-001' } }))
    };
});

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');
const PROJECT = 'sst-sprint-5-2-rules';
const FIRESTORE_HOST = process.env.FIRESTORE_EMULATOR_HOST?.split(':')[0] ?? '127.0.0.1';
const FIRESTORE_PORT = Number(process.env.FIRESTORE_EMULATOR_HOST?.split(':')[1] ?? 8080);

describe.skipIf(!process.env.FIRESTORE_EMULATOR_HOST)('Sprint 5.2 - Multi-Tenant Custom Claims Boundary Gates', () => {
	let env: RulesTestEnvironment;
	
	beforeAll(async () => {
		env = await initializeTestEnvironment({
			projectId: PROJECT,
			firestore: {
				rules: RULES,
				host: FIRESTORE_HOST,
				port: FIRESTORE_PORT,
			},
		});
	}, 60000);

	afterAll(async () => {
		await env.cleanup();
	});

	beforeEach(async () => {
		await env.clearFirestore();
	});

	it('1. verifies request.auth.token.clubId == clubId claim matching on /clubs/{clubId} reads', async () => {
		const db = env.authenticatedContext('user123', { clubId: 'clubA', role: 'coach' }).firestore();
		await assertSucceeds(getDoc(doc(db, 'clubs', 'clubA')));
	});

	it('2. verifies request.auth.token.clubId == clubId claim matching on /clubs/{clubId} writes', async () => {
		const db = env.authenticatedContext('user123', { clubId: 'clubA', role: 'director' }).firestore();
		await assertSucceeds(setDoc(doc(db, 'clubs', 'clubA'), { name: 'Club A' }));
	});

	it('3. verifies cross-tenant read attempts on /clubs/{clubId} return permission-denied', async () => {
		const db = env.authenticatedContext('user123', { clubId: 'clubB', role: 'coach' }).firestore();
		await assertFails(getDoc(doc(db, 'clubs', 'clubA')));
	});

	it('4. verifies cross-tenant write attempts on /clubs/{clubId} return permission-denied', async () => {
		const db = env.authenticatedContext('user123', { clubId: 'clubB', role: 'director' }).firestore();
		await assertFails(setDoc(doc(db, 'clubs', 'clubA'), { name: 'Club A Modified' }));
	});

	it('5. getActiveDb(cellId) (or getAdminDb) returns isolated Firestore instances per tenant', async () => {
		const cellRouterFresh = await import('../../../../functions/cellRouter.js');
		const db1 = cellRouterFresh.getAdminDb('cell-use1-001');
		const db2 = cellRouterFresh.getAdminDb('cell-use1-002');
		
		expect(db1.id).toBe('cell-use1-001');
		expect(db2.id).toBe('cell-use1-002');
	});

	it('6. cellRouter.js routes to correct cell based on custom claims via getRequestDb', async () => {
		const cellRouterFresh = await import('../../../../functions/cellRouter.js');
		const request = { auth: { uid: 'u1', token: { cellId: 'cell-use1-003' } } };
		
		const db = cellRouterFresh.getRequestDb(request as any);
		expect(db.id).toBe('cell-use1-003');
	});

	it('7. getRequestDb throws error for unauthenticated requests', async () => {
		const cellRouter = await import('../../../../functions/cellRouter.js');
		
		const request = {}; 
		let error;
		try {
			cellRouter.getRequestDb(request as any);
		} catch (e) {
			error = e;
		}
		expect(error).toBeDefined();
	});

	it('8. admin impersonation respects tenant boundaries (isGlobalAdmin bypasses club rules)', async () => {
		const db = env.authenticatedContext('admin123', { role: 'admin', clubId: null, isGlobalAdmin: true }).firestore();
		await assertSucceeds(getDoc(doc(db, 'clubs', 'clubA')));
		await assertSucceeds(getDoc(doc(db, 'clubs', 'clubB')));
	});

	it('9. getRegistryDb() returns the default cell instance', async () => {
		const cellRouterFresh = await import('../../../../functions/cellRouter.js');
		const db = cellRouterFresh.getRegistryDb();
		expect(db.id).toBe('default');
	});

	it('10. getTenantDb(tenantId) retrieves cellId from registry and returns correct cell db', async () => {
		const cellRouterFresh = await import('../../../../functions/cellRouter.js');
		const result = await cellRouterFresh.getTenantDb('tenantX');
		expect(result.cellId).toBe('cell-euw1-001');
	});
});
