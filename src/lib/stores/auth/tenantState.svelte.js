/** Multi-tenant JWT claim mirrors (tenantId / orgId / cellId). */
import { resolveCellId } from '$lib/types/cells.js';

export function createTenantState() {
	let tenantId = $state('');
	let orgId = $state('');
	let cellId = $state('(default)');

	function clearTenant() {
		tenantId = '';
		orgId = '';
		cellId = '(default)';
	}

	function applyResolved(resolved) {
		const resolvedTenantId = resolved.tenantId ?? String(resolved.profile?.clubId ?? '');
		if (tenantId !== resolvedTenantId) tenantId = resolvedTenantId;
		const resolvedOrgId = String(resolved.profile?.orgId ?? '');
		if (orgId !== resolvedOrgId) orgId = resolvedOrgId;
		const resolvedCellId = resolveCellId(resolved.cellId);
		if (cellId !== resolvedCellId) cellId = resolvedCellId;
	}

	function applyClaims(tokenResult) {
		const newTenantId = String(tokenResult.claims.tenantId || tokenResult.claims.clubId || '');
		const newOrgId = String(tokenResult.claims.orgId || '');
		const rawCellId = resolveCellId(tokenResult.claims.cellId);
		if (tenantId !== newTenantId) tenantId = newTenantId;
		if (orgId !== newOrgId) orgId = newOrgId;
		if (cellId !== rawCellId) cellId = rawCellId;
	}

	return {
		get tenantId() {
			return tenantId;
		},
		get currentTenantId() {
			return tenantId;
		},
		get orgId() {
			return orgId;
		},
		get cellId() {
			return cellId;
		},
		clearTenant,
		applyResolved,
		applyClaims,
	};
}
