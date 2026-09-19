import type { OrgManager } from '$lib/services/org.svelte.js';
import type { TenantRole } from '$lib/types/tenant';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export class OrgInvitesEngine {
	org = $state<OrgManager>({} as any);

	genOpen = $state(false);
	genRole = $state<TenantRole>('coach');
	genTeamId = $state('');
	genLimit = $state(1);
	genLoading = $state(false);
	genError = $state('');
	generatedCode = $state('');
	generatedExpiry = $state('');

	copyLabel = $state('COPY');
	copyUrlLabel = $state('COPY LINK');

	inviteFilter = $state<'ALL' | 'coach' | 'player'>('ALL');

	ROLE_COLORS: Record<string, string> = {
		coach: '#14b8a6',
		player: '#22c55e',
		director: '#a855f7',
		parent: '#f59e0b',
	};

	inviteBaseUrl = $derived(
		typeof window !== 'undefined'
			? `${window.location.origin}/join`
			: 'https://vanguard.app/join'
	);

	generatedInviteUrl = $derived(
		this.generatedCode ? `${this.inviteBaseUrl}?code=${this.generatedCode}` : ''
	);

	filteredInvites = $derived.by(() => {
		if (!this.org || !this.org.activeInvites) return [];
		return this.inviteFilter === 'ALL'
			? this.org.activeInvites
			: this.org.activeInvites.filter((inv) => inv.targetRole === this.inviteFilter);
	});

	constructor(org: OrgManager) {
		this.org = org;
	}

	openGenerate(role: TenantRole) {
		this.genRole = role;
		this.genTeamId = '';
		this.genLimit = 1;
		this.genError = '';
		this.generatedCode = '';
		this.generatedExpiry = '';
		this.genOpen = true;
	}

	async handleGenerate() {
		if (!db || !authStore.isAuthenticated) return;
		this.genError = '';
		this.genLoading = true;
		try {
			const result = await this.org.generateInvite(
				this.genRole,
				this.genTeamId || undefined,
				this.genLimit
			);
			this.generatedCode = result.code;
			this.generatedExpiry = result.expiresAt.toLocaleString(undefined, {
				dateStyle: 'medium',
				timeStyle: 'short',
			});
		} catch (err) {
			this.genError = err instanceof Error ? err.message : 'Failed to generate code.';
		} finally {
			this.genLoading = false;
		}
	}

	async copyCode() {
		if (!this.generatedCode) return;
		try {
			await navigator.clipboard.writeText(this.generatedCode);
			this.copyLabel = 'COPIED ✓';
			setTimeout(() => (this.copyLabel = 'COPY'), 2000);
		} catch {
			this.copyLabel = 'ERR';
		}
	}

	async copyInviteUrl() {
		if (!this.generatedInviteUrl) return;
		try {
			await navigator.clipboard.writeText(this.generatedInviteUrl);
			this.copyUrlLabel = 'COPIED ✓';
			setTimeout(() => (this.copyUrlLabel = 'COPY LINK'), 2500);
		} catch {
			this.copyUrlLabel = 'ERR';
		}
	}

	expiryLabel(inv: any): { text: string; danger: boolean } {
		if (!inv.expiresAt) return { text: '—', danger: false };
		const exDate =
			inv.expiresAt instanceof Date
				? inv.expiresAt
				: typeof inv.expiresAt === 'object' &&
						inv.expiresAt !== null &&
						'toDate' in (inv.expiresAt as object)
					? (inv.expiresAt as { toDate: () => Date }).toDate()
					: new Date(String(inv.expiresAt));
		const diff = exDate.getTime() - Date.now();
		if (diff < 0) return { text: 'EXPIRED', danger: true };
		const hrs = Math.floor(diff / 3_600_000);
		if (hrs < 4) return { text: `${hrs}h LEFT`, danger: true };
		if (hrs < 24) return { text: `${hrs}h LEFT`, danger: false };
		return { text: `${Math.floor(hrs / 24)}d LEFT`, danger: false };
	}

	usageBar(inv: any): number {
		const limit = inv.usageLimit ?? 1;
		const used = inv.usageCount ?? 0;
		return limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
	}
}
