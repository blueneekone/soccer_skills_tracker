<script>
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import {
		collection,
		query,
		where,
		onSnapshot,
		addDoc,
		serverTimestamp,
	} from 'firebase/firestore';
	import { DEFAULT_SPORT_CONFIG } from '$lib/config/sports.js';

	/** @type {Record<string, string>} */
	const attrMap = Object.fromEntries(
		DEFAULT_SPORT_CONFIG.attributes.map((a) => [a.id, a.name]),
	);

	const REWARD_OPTIONS = [
		{ id: 'checkr_5', label: '$5 Checkr Credit' },
		{ id: 'gear_perk', label: 'Gear Perk Unlock' },
		{ id: 'treat', label: 'Post-Game Treat' },
	];

	/** @type {Array<Record<string, unknown> & { id: string }>} */
	let assignments = $state([]);

	/** @type {(Record<string, unknown> & { id: string }) | null} */
	let selectedAssignment = $state(null);

	let selectedReward = $state('');
	let isStaking = $state(false);
	let stakeSuccess = $state(false);
	let stakeError = $state('');

	const linkedPlayerId = $derived(
		/** @type {string | null} */ (authStore.userProfile?.linkedPlayerId ?? null),
	);

	$effect(() => {
		if (!linkedPlayerId) return;

		const q = query(
			collection(db, 'team_assignments'),
			where('teamId', '==', linkedPlayerId),
		);

		const unsub = onSnapshot(q, (snap) => {
			assignments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
		});

		return () => unsub();
	});

	async function handleStake() {
		if (!selectedAssignment || !selectedReward || isStaking) return;
		isStaking = true;
		stakeError = '';
		stakeSuccess = false;
		try {
			await addDoc(collection(db, 'bounties'), {
				clubId: authStore.userProfile?.clubId ?? '',
				assignmentId: selectedAssignment.id,
				playerId: authStore.userProfile?.linkedPlayerId ?? '',
				sponsorUid: authStore.user?.uid ?? '',
				rewardType: selectedReward,
				status: 'escrow',
				createdAt: serverTimestamp(),
			});
			stakeSuccess = true;
			selectedAssignment = null;
			selectedReward = '';
		} catch (e) {
			stakeError = e instanceof Error ? e.message : 'STAKE FAILED. TRY AGAIN.';
		} finally {
			isStaking = false;
		}
	}

	/** @param {Record<string, unknown> & { id: string }} assignment */
	function selectAssignment(assignment) {
		selectedAssignment = assignment;
		selectedReward = '';
		stakeSuccess = false;
		stakeError = '';
	}
</script>

<div
	class="tw-w-full tw-backdrop-blur-[40px] tw-bg-[#040f16]/85 tw-border tw-border-[#00f0ff]/20 tw-rounded-xl tw-p-6 tw-flex tw-flex-col tw-gap-5"
>
	<!-- HEADER -->
	<div class="tw-flex tw-flex-col tw-gap-1">
		<div class="tw-flex tw-items-center tw-gap-2">
			<span
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50 tw-uppercase"
			>
				//
			</span>
			<h2 class="tw-font-mono tw-text-[13px] tw-tracking-widest tw-text-[#00f0ff] tw-uppercase">
				BOUNTY TERMINAL
			</h2>
		</div>
		<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase">
			[ SPONSOR HOMEWORK BOUNTY ]
		</p>
	</div>

	<!-- DIVIDER -->
	<div class="tw-w-full tw-h-px tw-bg-[#00f0ff]/10"></div>

	<!-- NO LINKED PLAYER -->
	{#if !linkedPlayerId}
		<div
			class="tw-rounded-lg tw-bg-[#020202] tw-border tw-border-[#00f0ff]/10 tw-px-5 tw-py-6 tw-flex tw-items-center tw-justify-center"
		>
			<span
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase"
			>
				[ NO LINKED PLAYER — CONFIGURE HOUSEHOLD ]
			</span>
		</div>

	<!-- NO ASSIGNMENTS -->
	{:else if assignments.length === 0}
		<div
			class="tw-rounded-lg tw-bg-[#020202] tw-border tw-border-[#00f0ff]/10 tw-px-5 tw-py-6 tw-flex tw-items-center tw-justify-center"
		>
			<span
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase"
			>
				[ NO ACTIVE TACTICAL INTENTS ]
			</span>
		</div>

	<!-- ASSIGNMENT LIST -->
	{:else}
		<div class="tw-flex tw-flex-col tw-gap-2">
			<p class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase tw-mb-1">
				SELECT ACTIVE ASSIGNMENT
			</p>
			{#each assignments as assignment (assignment.id)}
				{@const attrId = String(assignment.targetAttributeId ?? '')}
				{@const attrLabel = attrMap[attrId] ?? attrId}
				{@const xpRequired = Number(assignment.xpRequired ?? assignment.requiredXp ?? 0)}
				{@const isSelected = selectedAssignment?.id === assignment.id}
				<div
					class="tw-flex tw-items-center tw-justify-between tw-gap-4 tw-rounded-lg tw-bg-[#020202] tw-border tw-px-4 tw-py-3 tw-transition-all tw-duration-200
						{isSelected
						? 'tw-border-[#00f0ff]/60 tw-shadow-[0_0_15px_rgba(0,240,255,0.4),inset_0_0_8px_rgba(0,240,255,0.2)]'
						: 'tw-border-[#00f0ff]/10 hover:tw-border-[#00f0ff]/30'}"
				>
					<div class="tw-flex tw-flex-col tw-gap-1 tw-min-w-0">
						<span
							class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#e0e0e0] tw-uppercase tw-truncate"
						>
							{attrLabel}
						</span>
						{#if xpRequired > 0}
							<span
								class="tw-inline-flex tw-items-center tw-gap-1 tw-font-mono tw-text-[9px] tw-tracking-widest tw-text-[#ffcc00] tw-uppercase"
							>
								<span class="tw-w-1.5 tw-h-1.5 tw-rounded-full tw-bg-[#ffcc00] tw-inline-block"></span>
								{xpRequired} XP REQUIRED
							</span>
						{/if}
					</div>
					<button
						onclick={() => selectAssignment(assignment)}
						class="tw-flex-shrink-0 tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-border tw-border-[#00f0ff]/40 tw-text-[#00f0ff] tw-bg-[#00f0ff]/5 tw-rounded tw-px-3 tw-py-1.5 tw-transition-all tw-duration-150 hover:tw-bg-[#00f0ff]/15 hover:tw-border-[#00f0ff]/70 hover:tw-shadow-[0_0_10px_rgba(0,240,255,0.3)]"
					>
						[ SELECT ]
					</button>
				</div>
			{/each}
		</div>

		<!-- REWARD PICKER — revealed once assignment is selected -->
		{#if selectedAssignment}
			<div class="tw-flex tw-flex-col tw-gap-3">
				<p
					class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/40 tw-uppercase"
				>
					CHOOSE REWARD TYPE
				</p>
				<div class="tw-grid tw-grid-cols-3 tw-gap-2">
					{#each REWARD_OPTIONS as opt (opt.id)}
						{@const isActive = selectedReward === opt.id}
						<button
							onclick={() => (selectedReward = opt.id)}
							class="tw-font-mono tw-text-[9px] tw-tracking-widest tw-uppercase tw-border tw-rounded-lg tw-px-3 tw-py-3 tw-transition-all tw-duration-150 tw-text-center
								{isActive
								? 'tw-border-[#00f0ff]/70 tw-text-[#00f0ff] tw-bg-[#00f0ff]/10 tw-shadow-[0_0_15px_rgba(0,240,255,0.4),inset_0_0_8px_rgba(0,240,255,0.2)]'
								: 'tw-border-[#00f0ff]/15 tw-text-[#00f0ff]/50 tw-bg-transparent hover:tw-border-[#00f0ff]/40 hover:tw-text-[#00f0ff]/80'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- SUCCESS / ERROR FLASH -->
			{#if stakeSuccess}
				<div
					class="tw-rounded-lg tw-bg-[#00ff66]/10 tw-border tw-border-[#00ff66]/30 tw-px-4 tw-py-3 tw-text-center"
				>
					<span
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00ff66] tw-uppercase"
					>
						[ BOUNTY STAKED TO ESCROW — AWAITING PLAYER COMPLETION ]
					</span>
				</div>
			{/if}
			{#if stakeError}
				<div
					class="tw-rounded-lg tw-bg-[#ff0055]/10 tw-border tw-border-[#ff0055]/30 tw-px-4 tw-py-3 tw-text-center"
				>
					<span
						class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#ff0055] tw-uppercase"
					>
						[ {stakeError} ]
					</span>
				</div>
			{/if}

			<!-- CTA: SPONSOR BOUNTY -->
			<button
				onclick={handleStake}
				disabled={!selectedReward || isStaking}
				class="tw-w-full tw-font-mono tw-text-[10px] tw-tracking-widest tw-uppercase tw-border tw-border-[#ffcc00]/40 tw-text-[#ffcc00] tw-bg-[#ffcc00]/5 tw-rounded-lg tw-px-6 tw-py-3.5 tw-transition-all tw-duration-200
					{!selectedReward || isStaking
					? 'tw-opacity-40 tw-cursor-not-allowed'
					: 'hover:tw-bg-[#ffcc00]/10 hover:tw-shadow-[0_0_12px_rgba(255,204,0,0.3)] hover:tw-border-[#ffcc00]/70'}"
			>
				{#if isStaking}
					[ STAKING... ]
				{:else}
					[ SPONSOR HOMEWORK BOUNTY ]
				{/if}
			</button>
		{/if}
	{/if}
</div>
