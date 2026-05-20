/** Multi-tenant JWT claim mirrors (tenantId / orgId / cellId). */
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
		const resolvedCellId = resolved.cellId || '(default)';
		if (cellId !== resolvedCellId) cellId = resolvedCellId;
	}

	function applyClaims(tokenResult) {
		const newTenantId = String(tokenResult.claims.tenantId || tokenResult.claims.clubId || '');
		const newOrgId = String(tokenResult.claims.orgId || '');
		const rawCellId =
			typeof tokenResult.claims.cellId === 'string' && tokenResult.claims.cellId.trim().length > 0
				? tokenResult.claims.cellId.trim()
				: '(default)';
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
