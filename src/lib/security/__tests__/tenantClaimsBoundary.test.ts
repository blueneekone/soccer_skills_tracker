import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const RULES = readFileSync(resolve('firestore.rules'), 'utf8');

describe('Sprint 5.2 - Multi-Tenant Custom Claims Boundary Gates', () => {
	it('validates God-mode analytics metrics are strictly scoped and cannot leak across tenants', () => {
		expect(RULES).toMatch(/match \/analytics\/\{document=\*\*\}/);
		const analyticsBlock = RULES.match(/match \/analytics\/\{document=\*\*\}[\s\S]*?(?=match \/|$)/);
		expect(analyticsBlock).not.toBeNull();
		expect(analyticsBlock![0]).toMatch(/allow read, write: if isGlobalAdmin\(\);/);
	});

	it('validates tenant boundaries correctly scope organizations and tenants by tenantId or clubId', () => {
		expect(RULES).toMatch(/match \/organizations\/\{tenantId\}/);
		const orgBlock = RULES.match(/match \/organizations\/\{tenantId\}[\s\S]*?(?=match \/|$)/);
		expect(orgBlock).not.toBeNull();
		expect(orgBlock![0]).toMatch(/request\.auth\.token\.tenantId == tenantId \|\| request\.auth\.token\.clubId == tenantId/);

		expect(RULES).toMatch(/match \/tenants\/\{tenantId\}/);
		const tenantBlock = RULES.match(/match \/tenants\/\{tenantId\}[\s\S]*?(?=match \/|$)/);
		expect(tenantBlock).not.toBeNull();
		expect(tenantBlock![0]).toMatch(/allow read, list: if isGlobalAdmin\(\) \|\| \(isAuthenticated\(\) && \(\s*request\.auth\.token\.tenantId == tenantId \|\| request\.auth\.token\.clubId == tenantId\s*\)\);/);
	});

	it('validates users collection read enforces tenantId or clubId boundaries', () => {
		expect(RULES).toMatch(/match \/users\/\{emailOrUid\}/);
		const usersBlock = RULES.match(/match \/users\/\{emailOrUid\}[\s\S]*?(?=match \/|$)/);
		expect(usersBlock).not.toBeNull();
		expect(usersBlock![0]).toMatch(/\(request\.auth\.token\.clubId != null && resource\.data\.clubId == request\.auth\.token\.clubId\)/);
		expect(usersBlock![0]).toMatch(/\(request\.auth\.token\.tenantId != null && resource\.data\.tenantId == request\.auth\.token\.tenantId\)/);
	});
});
