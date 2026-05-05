<script>
	import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	/**
	 * @typedef {{ id: string, title: string, subtitle: string, xp: number, bountyTone: 'emerald' | 'gold' }} ArmoryDrill
	 * @typedef {{ key: string, title: string, xp: number, reps: number, durationMin: number }} PayloadSlot
	 */

	/** @type {ArmoryDrill[]} */
	const ARMORY_DRILLS = [
		{
			id: 'atk-pass',
			title: 'Attacking Third Passing',
			subtitle: 'Break lines · tempo · weight',
			xp: 150,
			bountyTone: 'emerald',
		},
		{
			id: 'agility-ladder',
			title: 'Agility Ladder Blitz',
			subtitle: 'Foot speed · coordination',
			xp: 120,
			bountyTone: 'gold',
		},
		{
			id: 'press-counter',
			title: 'Press & Counter Transition',
			subtitle: 'Collective triggers · outlet lanes',
			xp: 200,
			bountyTone: 'emerald',
		},
		{
			id: 'finish-pressure',
			title: 'Finishing Under Pressure',
			subtitle: 'Composure · shot selection',
			xp: 175,
			bountyTone: 'gold',
		},
		{
			id: 'recovery-compact',
			title: 'Recovery Runs & Compact Shape',
			subtitle: 'Rest defence · distances',
			xp: 90,
			bountyTone: 'emerald',
		},
	];

	/** @type {PayloadSlot[]} */
	let payload = $state([
		{
			key: 'seed-1',
			title: 'Small-Sided Possession (Rondo)',
			xp: 140,
			reps: 8,
			durationMin: 18,
		},
		{
			key: 'seed-2',
			title: 'Wide Overloads → Cutback Pattern',
			xp: 165,
			reps: 6,
			durationMin: 22,
		},
	]);

	const totalMissionBounty = $derived(payload.reduce((sum, row) => sum + row.xp, 0));

	let isDeploying = $state(false);
	let deploySuccess = $state(false);
	let deployErr = $state('');

	const coachUid = $derived(authStore.user?.uid ?? '');

	const deployButtonClass = $derived.by(() => {
		const base =
			'forge-deploy tw-flex tw-w-full tw-items-center tw-justify-center tw-gap-3 tw-rounded-xl tw-border tw-py-4 tw-text-center tw-text-sm tw-font-black tw-uppercase tw-tracking-[0.25em] tw-transition focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2';
		if (deploySuccess) {
			return `${base} tw-border-emerald-500/60 tw-bg-gradient-to-r tw-from-emerald-700 tw-via-emerald-600 tw-to-teal-600 tw-text-emerald-50 tw-shadow-[0_0_28px_rgba(52,211,153,0.45)] focus-visible:tw-outline-emerald-300`;
		}
		if (isDeploying) {
			return `${base} tw-cursor-wait tw-border-cyan-400/45 tw-bg-gradient-to-r tw-from-cyan-700 tw-via-cyan-600 tw-to-teal-700 tw-text-white tw-shadow-[0_0_24px_rgba(0, 240, 255,0.35)] focus-visible:tw-outline-cyan-300`;
		}
		const idleCyan = `${base} tw-border-cyan-400/50 tw-bg-gradient-to-r tw-from-cyan-600 tw-via-cyan-500 tw-to-teal-500 tw-text-white tw-shadow-[0_0_32px_rgba(0, 240, 255,0.45)] focus-visible:tw-outline-cyan-300`;
		if (payload.length === 0) {
			return `${idleCyan} tw-cursor-not-allowed tw-opacity-60`;
		}
		return `${idleCyan} hover:tw-border-cyan-300 hover:tw-shadow-[0_0_48px_rgba(0, 240, 255,0.55)]`;
	});

	const deployPulseClass = $derived(
		!isDeploying && !deploySuccess && payload.length > 0 ? 'forge-deploy--pulse' : '',
	);

	async function deployMission() {
		if (payload.length === 0) return;
		if (!coachUid) {
			deployErr = 'Sign in to deploy a mission.';
			return;
		}
		deployErr = '';
		isDeploying = true;
		deploySuccess = false;

		const drills = payload.map((r) => ({
			key: r.key,
			title: r.title,
			xp: r.xp,
			reps: r.reps,
			durationMin: r.durationMin,
		}));
		const calculatedTotalXp = drills.reduce((sum, d) => sum + d.xp, 0);

		const missionData = {
			coachId: coachUid,
			totalXpBounty: calculatedTotalXp,
			drills,
			status: 'deployed',
			createdAt: serverTimestamp(),
		};

		try {
			await addDoc(collection(db, 'missions'), missionData);
			isDeploying = false;
			deploySuccess = true;
			setTimeout(() => {
				payload = [];
				deploySuccess = false;
			}, 2000);
		} catch (e) {
			console.error('[Forge] deployMission', e);
			deployErr = e instanceof Error ? e.message : 'Deploy failed';
			isDeploying = false;
		}
	}

	/**
	 * @param {ArmoryDrill} drill
	 */
	function addToPayload(drill) {
		payload = [
			...payload,
			{
				key: `${drill.id}-${crypto.randomUUID()}`,
				title: drill.title,
				xp: drill.xp,
				reps: 10,
				durationMin: 15,
			},
		];
	}
</script>

<!-- Vanguard Forge — bg-[#020202] root, glassmorphic cards, mono telemetry. -->
<div class="forge-route tw-relative tw-min-h-screen tw-w-full tw-bg-[#020202] tw-px-3 tw-py-6 sm:tw-px-5">
	<div
		class="tw-rounded-2xl tw-border tw-border-white/10 tw-bg-[#020202]/80 tw-p-6 tw-shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),_0_20px_40px_rgba(0,0,0,0.5)] tw-backdrop-blur-3xl md:tw-p-8"
	>
		<header class="tw-mb-10 tw-text-center md:tw-text-left">
			<p class="tw-mb-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.35em] tw-text-cyan-400/80">
				Coach OS · Workout Architect
			</p>
			<h1
				class="tw-font-black tw-uppercase tw-tracking-tight tw-text-white tw-drop-shadow-[0_0_24px_rgba(0, 240, 255,0.25)] md:tw-text-5xl tw-text-3xl"
			>
				<span class="tw-text-slate-500">[</span>
				The Forge <span class="tw-text-slate-600">:</span>
				<span class="tw-text-cyan-300">Mission Architect</span>
				<span class="tw-text-slate-500">]</span>
			</h1>
		</header>

		<!-- Armory -->
		<section class="tw-mb-12" aria-labelledby="forge-armory-heading">
			<div class="tw-mb-6 tw-flex tw-flex-col tw-gap-2 md:tw-flex-row md:tw-items-end md:tw-justify-between">
				<div>
					<h2 id="forge-armory-heading" class="tw-text-lg tw-font-black tw-uppercase tw-tracking-wide tw-text-white">
						The Armory
					</h2>
					<p class="tw-mt-1 tw-text-sm tw-text-slate-400">Available drills · authorize loadout modules</p>
				</div>
				<span
					class="tw-inline-flex tw-items-center tw-rounded-full tw-border tw-border-emerald-500/30 tw-bg-emerald-500/10 tw-px-3 tw-py-1 tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-emerald-300"
				>
					Live schematic cache
				</span>
			</div>

			<div
				class="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2 xl:tw-grid-cols-3"
			>
				{#each ARMORY_DRILLS as drill (drill.id)}
					<article
						class="tw-group tw-relative tw-flex tw-flex-col tw-overflow-hidden tw-rounded-xl tw-border tw-border-white/10 tw-bg-[#020202]/80 tw-p-4 tw-backdrop-blur-3xl tw-transition hover:tw-border-cyan-500/25 hover:tw-shadow-[0_0_28px_rgba(0, 240, 255,0.12)]"
					>
						<div class="tw-mb-3 tw-flex tw-items-start tw-justify-between tw-gap-3">
							<div class="tw-min-w-0">
								<h3 class="tw-text-base tw-font-bold tw-leading-snug tw-text-slate-100">{drill.title}</h3>
								<p class="tw-mt-1 tw-text-xs tw-text-slate-500">{drill.subtitle}</p>
							</div>
						</div>

						<div class="tw-mb-4 tw-flex tw-flex-wrap tw-items-center tw-gap-2">
							<span
								class="tw-rounded-md tw-px-2.5 tw-py-1 tw-text-[11px] tw-font-black tw-uppercase tw-tracking-wide tw-ring-1 tw-ring-inset {drill.bountyTone ===
								'emerald'
									? 'tw-bg-emerald-500/15 tw-text-emerald-300 tw-ring-emerald-400/40 tw-shadow-[0_0_14px_rgba(52,211,153,0.35)]'
									: 'tw-bg-amber-500/15 tw-text-amber-200 tw-ring-amber-400/45 tw-shadow-[0_0_14px_rgba(251,191,36,0.35)]'}"
							>
								XP Bounty · +{drill.xp} XP
							</span>
						</div>

						<button
							type="button"
							class="tw-mt-auto tw-inline-flex tw-w-full tw-items-center tw-justify-center tw-gap-2 tw-rounded-lg tw-border tw-border-cyan-500/35 tw-bg-cyan-950/40 tw-py-2.5 tw-text-xs tw-font-black tw-uppercase tw-tracking-widest tw-text-cyan-200 tw-transition hover:tw-border-cyan-400/60 hover:tw-bg-cyan-900/50 hover:tw-text-white focus-visible:tw-outline focus-visible:tw-outline-2 focus-visible:tw-outline-offset-2 focus-visible:tw-outline-cyan-400"
							onclick={() => addToPayload(drill)}
						>
							<i class="ph ph-plus-circle tw-text-base" aria-hidden="true"></i>
							Add to payload
						</button>
					</article>
				{/each}
			</div>
		</section>

		<!-- Payload -->
		<section aria-labelledby="forge-payload-heading">
			<div
				class="tw-rounded-2xl tw-border-2 tw-border-dashed tw-border-cyan-500/20 tw-bg-[#020202]/80 tw-p-5 tw-shadow-inner md:tw-p-8"
			>
				<div class="tw-mb-8 tw-text-center">
					<h2 id="forge-payload-heading" class="tw-text-xs tw-font-bold tw-uppercase tw-tracking-[0.28em] tw-text-slate-500">
						The Payload
					</h2>
					<p class="tw-mt-2 tw-text-[11px] tw-font-semibold tw-uppercase tw-tracking-wider tw-text-slate-600">
						Active mission timeline
					</p>
					<p
						class="forge-bounty-total tw-mt-6 tw-font-black tw-tabular-nums tw-text-cyan-400 tw-text-4xl tw-tracking-tight tw-shadow-[0_0_15px_rgba(0, 240, 255,0.5)] md:tw-text-5xl"
					>
						{totalMissionBounty.toLocaleString()}
						<span class="tw-text-lg tw-font-bold tw-text-cyan-200/80 md:tw-text-xl">XP</span>
					</p>
					<p class="tw-mt-2 tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-[0.2em] tw-text-slate-500">
						Total mission bounty
					</p>
				</div>

				<ul class="tw-mb-10 tw-space-y-4 tw-p-0">
					{#each payload as row (row.key)}
						<li
							class="tw-rounded-xl tw-border tw-border-white/10 tw-bg-slate-900/80 tw-p-4 tw-ring-1 tw-ring-inset tw-ring-cyan-500/10"
						>
							<div class="tw-mb-4 tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between">
								<div class="tw-min-w-0">
									<p class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">
										Locked module
									</p>
									<h3 class="tw-truncate tw-text-sm tw-font-bold tw-text-slate-100">{row.title}</h3>
								</div>
								<span
									class="tw-shrink-0 tw-rounded-md tw-bg-emerald-500/15 tw-px-2 tw-py-1 tw-text-center tw-text-[11px] tw-font-black tw-text-emerald-300 tw-ring-1 tw-ring-emerald-400/35"
								>
									+{row.xp} XP
								</span>
							</div>

							<div class="tw-grid tw-grid-cols-1 tw-gap-4 sm:tw-grid-cols-2">
								<label class="tw-flex tw-flex-col tw-gap-1.5">
									<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wide tw-text-slate-500">
										Target reps
									</span>
									<input
										type="number"
										min="1"
										max="999"
										class="tw-rounded-lg tw-border tw-border-white/10 tw-bg-slate-950 tw-px-3 tw-py-2 tw-font-mono tw-text-sm tw-text-cyan-100 tw-outline-none focus-visible:tw-border-cyan-500/50"
										bind:value={row.reps}
									/>
								</label>
								<label class="tw-flex tw-flex-col tw-gap-1.5">
									<span class="tw-text-[10px] tw-font-bold tw-uppercase tw-tracking-wide tw-text-slate-500">
										Duration (min)
									</span>
									<input
										type="number"
										min="1"
										max="180"
										class="tw-rounded-lg tw-border tw-border-white/10 tw-bg-slate-950 tw-px-3 tw-py-2 tw-font-mono tw-text-sm tw-text-cyan-100 tw-outline-none focus-visible:tw-border-cyan-500/50"
										bind:value={row.durationMin}
									/>
								</label>
							</div>
						</li>
					{/each}
				</ul>

				{#if deployErr}
					<p class="tw-mb-3 tw-text-center tw-text-xs tw-font-semibold tw-text-red-400" role="alert">
						{deployErr}
					</p>
				{/if}

				<button
					type="button"
					disabled={payload.length === 0 || isDeploying || deploySuccess}
					class="{deployButtonClass} {deployPulseClass}"
					aria-busy={isDeploying}
					onclick={() => void deployMission()}
				>
					{#if isDeploying}
						<i class="ph ph-spinner-gap tw-animate-spin tw-text-xl" aria-hidden="true"></i>
						<span>Uploading to satellite...</span>
					{:else if deploySuccess}
						<i class="ph ph-check-circle tw-text-xl" aria-hidden="true"></i>
						<span>Mission deployed!</span>
					{:else}
						<span>Deploy mission to squad</span>
					{/if}
				</button>
			</div>
		</section>
	</div>
</div>

<style>
	.forge-deploy--pulse {
		animation: forge-deploy-pulse 2.2s ease-in-out infinite;
	}

	@keyframes forge-deploy-pulse {
		0%,
		100% {
			box-shadow:
				0 0 28px rgba(0, 240, 255, 0.4),
				0 0 0 0 rgba(0, 240, 255, 0.2);
			filter: brightness(1);
		}
		50% {
			box-shadow:
				0 0 48px rgba(0, 240, 255, 0.65),
				0 0 80px rgba(20, 184, 166, 0.25);
			filter: brightness(1.06);
		}
	}

	.forge-bounty-total {
		text-shadow: 0 0 24px rgba(0, 240, 255, 0.45);
	}
</style>
