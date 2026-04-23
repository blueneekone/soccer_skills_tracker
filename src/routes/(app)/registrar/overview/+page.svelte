<script>
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { teamsStore } from '$lib/stores/teams.svelte.js';
	import { workspaceContextStore } from '$lib/stores/workspaceContext.svelte.js';
	import { loadComplianceTable } from '$lib/registrar/loadComplianceRows.js';
	import ClubLogoMark from '$lib/components/ClubLogoMark.svelte';
	import ActionInbox from '$lib/components/shell/ActionInbox.svelte';
	import WorkspaceSocShell from '$lib/components/workspace/WorkspaceSocShell.svelte';
	import WorkspaceSocMetricGrid from '$lib/components/workspace/WorkspaceSocMetricGrid.svelte';
	import '$lib/styles/enterprise-console.css';

	const clubId = $derived.by(() => {
		const role = authStore.role;
		const raw =
			typeof authStore.userProfile?.clubId === 'string' ? authStore.userProfile.clubId.trim() : '';
		if (raw) return raw;
		if (role === 'super_admin' || role === 'global_admin') {
			const a = workspaceContextStore.activeClubId?.trim();
			if (a) return a;
			const first = teamsStore.clubs[0]?.id;
			if (first) return first;
		}
		return '';
	});

	const clubTeams = $derived(
		clubId ? teamsStore.teams.filter((t) => t.clubId === clubId) : [],
	);
	const scopeTeams = $derived(clubTeams);

	let complianceRows = $state([]);
	let tableLoading = $state(false);
	let tableErr = $state('');

	$effect(() => {
		const teams = scopeTeams;
		if (!teams.length) {
			complianceRows = [];
			return;
		}
		let cancelled = false;
		tableLoading = true;
		tableErr = '';
		void loadComplianceTable(teams)
			.then((rows) => {
				if (!cancelled) complianceRows = rows;
			})
			.catch((e) => {
				if (!cancelled) {
					tableErr = e instanceof Error ? e.message : 'Could not load roster.';
					console.error('[registrar/overview]', e);
				}
			})
			.finally(() => {
				if (!cancelled) tableLoading = false;
			});
		return () => {
			cancelled = true;
		};
	});

	const ribbonRows = $derived.by(() => {
		const badW = complianceRows.filter((r) => r.waiverKind === 'bad').length;
		const un = complianceRows.filter((r) => !r.guardianLinked).length;
		return [
			{
				k: 'Matrix rows',
				v: tableLoading ? '…' : String(complianceRows.length),
				s: 'Athletes evaluated',
			},
			{ k: 'Teams', v: String(scopeTeams.length), s: 'Registrar scope' },
			{ k: 'Waiver debt', v: String(badW), s: 'Unsigned / missing' },
			{ k: 'Linkage debt', v: String(un), s: 'No guardian email' },
		];
	});

	const metrics = $derived.by(() => {
		const rows = complianceRows;
		const teams = scopeTeams.length;
		const badWaiver = rows.filter((r) => r.waiverKind === 'bad').length;
		const badPass = rows.filter((r) => r.passportKind === 'bad').length;
		const warnPass = rows.filter((r) => r.passportKind === 'warn').length;
		const unlink = rows.filter((r) => !r.guardianLinked).length;
		const athletes = rows.length;
		const passDebt = badPass + warnPass;

		return [
			{
				label: 'Program teams',
				value: String(teams),
				hint: 'In registrar scope',
				band: /** @type {const} */ ('info'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Athlete rows',
				value: tableLoading ? '…' : String(athletes),
				hint: 'Compliance matrix',
				band: /** @type {const} */ ('low'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Waivers open',
				value: tableLoading ? '…' : String(badWaiver),
				hint: 'Missing signature',
				band: badWaiver ? /** @type {const} */ ('high') : /** @type {const} */ ('ok'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Passport gaps',
				value: tableLoading ? '…' : String(passDebt),
				hint: 'Expired / pending',
				band: badPass
					? /** @type {const} */ ('high')
					: warnPass
						? /** @type {const} */ ('med')
						: /** @type {const} */ ('ok'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Guardian gaps',
				value: tableLoading ? '…' : String(unlink),
				hint: 'No login linked',
				band: unlink ? /** @type {const} */ ('med') : /** @type {const} */ ('ok'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Desk posture',
				value: tableErr ? 'Degraded' : tableLoading ? '…' : 'Nominal',
				hint: 'Ingest + rules',
				band: tableErr ? /** @type {const} */ ('high') : /** @type {const} */ ('ok'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'VPC alignment',
				value: unlink > 2 ? 'Review' : 'Green',
				hint: 'Household linkage',
				band: unlink > 2 ? /** @type {const} */ ('med') : /** @type {const} */ ('ok'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
			{
				label: 'Next step',
				value: 'Desk',
				hint: 'Transfers + roster edits',
				band: /** @type {const} */ ('info'),
				delta: '—',
				deltaDir: /** @type {const} */ ('flat'),
			},
		];
	});
</script>

<div class="ec-page ec-registrar-overview tw-pb-8">
	<div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-gap-3">
		{#if clubId}
			<ClubLogoMark size="lg" />
		{/if}
	</div>

	<WorkspaceSocShell
		eyebrow="Registrar workspace · compliance operations"
		title="Compliance overview"
		lede="SIEM-style posture for waivers, passports, and guardian linkage. Open the compliance desk for roster edits, transfers, and invites."
		ribbon={ribbonRows}
		metaLine="Club scope · client"
	>
		<WorkspaceSocMetricGrid metrics={metrics} />

		<p class="tw-m-0">
			<a
				class="tw-inline-flex tw-items-center tw-gap-2 tw-rounded-lg tw-border tw-border-cyan-500/40 tw-bg-cyan-500/10 tw-px-4 tw-py-2.5 tw-text-sm tw-font-bold tw-text-cyan-100 hover:tw-bg-cyan-500/20"
				href="/registrar"
			>
				<i class="ph ph-arrow-square-out" aria-hidden="true"></i>
				Open full compliance desk
			</a>
		</p>

		<div class="wsd-surface-accent tw-overflow-hidden tw-rounded-xl">
			<ActionInbox clubId={clubId || ''} teamId="" />
		</div>
	</WorkspaceSocShell>
</div>
