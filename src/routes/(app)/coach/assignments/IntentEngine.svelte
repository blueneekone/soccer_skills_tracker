<script>
	import {
		doc,
		getDoc,
		setDoc,
		addDoc,
		collection,
		serverTimestamp,
		Timestamp
	} from 'firebase/firestore';
	import { db } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { DEFAULT_SPORT_CONFIG } from '$lib/config/sports.js';

	/** @type {import('$lib/config/sports.js').SportConfig | null} */
	let sportConfig = $state(null);
	let selectedAttributeId = $state('');
	let targetXp = $state(150);
	let isDeploying = $state(false);
	let flashSuccess = $state(false);
	let flashError = $state(false);

	const attributes = $derived(sportConfig?.attributes ?? DEFAULT_SPORT_CONFIG.attributes);

	$effect(() => {
		let cancelled = false;

		async function loadConfig() {
			try {
				const ref = doc(db, 'sports_configs', 'soccer');
				const snap = await getDoc(ref);
				/** @type {import('$lib/config/sports.js').SportConfig} */
				let config;

				if (snap.exists()) {
					const data = /** @type {Record<string, unknown>} */ (snap.data());
					const hasAttrs = Array.isArray(data.attributes) && data.attributes.length > 0;
					if (!hasAttrs) {
						config = { ...DEFAULT_SPORT_CONFIG, .../** @type {any} */ (data), attributes: DEFAULT_SPORT_CONFIG.attributes };
						setDoc(ref, { attributes: DEFAULT_SPORT_CONFIG.attributes }, { merge: true }).catch(() => {});
					} else {
						config = /** @type {any} */ (data);
					}
				} else {
					config = DEFAULT_SPORT_CONFIG;
					setDoc(ref, DEFAULT_SPORT_CONFIG, { merge: true }).catch(() => {});
				}

				if (!cancelled) {
					sportConfig = config;
					if (!selectedAttributeId && config.attributes.length > 0) {
						selectedAttributeId = config.attributes[0].id;
					}
				}
			} catch (err) {
				console.error('[IntentEngine] sport config load error:', err);
				if (!cancelled) {
					sportConfig = DEFAULT_SPORT_CONFIG;
					if (!selectedAttributeId) selectedAttributeId = DEFAULT_SPORT_CONFIG.attributes[0].id;
				}
			}
		}

		loadConfig();
		return () => { cancelled = true; };
	});

	async function deployIntent() {
		if (!selectedAttributeId || isDeploying || flashSuccess) return;
		isDeploying = true;
		flashError = false;

		try {
			await addDoc(collection(db, 'team_assignments'), {
				teamId: String(/** @type {Record<string, unknown>} */ (authStore.userProfile)?.['teamId'] ?? ''),
				assignedByUid: authStore.user?.uid ?? '',
				targetAttributeId: selectedAttributeId,
				requiredXp: targetXp,
				expiresAt: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
				createdAt: serverTimestamp()
			});

			flashSuccess = true;
			setTimeout(() => {
				flashSuccess = false;
				selectedAttributeId = attributes[0]?.id ?? '';
				targetXp = 150;
			}, 2000);
		} catch (err) {
			console.error('[IntentEngine] deploy error:', err);
			flashError = true;
			setTimeout(() => { flashError = false; }, 3000);
		} finally {
			isDeploying = false;
		}
	}
</script>

<div
	class="vanguard-surface tw-flex tw-flex-col tw-gap-5 tw-p-6"
>
	<!-- Header -->
	<div class="tw-flex tw-flex-col tw-gap-0.5">
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/60">
			[ // INTENT ENGINE ]
		</span>
		<span class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-white/30">
			[ ASSIGNMENT TERMINAL ]
		</span>
	</div>

	<div class="tw-w-full tw-h-px tw-bg-[#00f0ff]/10"></div>

	<!-- Target attribute dropdown -->
	<div class="tw-flex tw-flex-col tw-gap-2">
		<label
			class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50"
			for="attr-select"
		>
			TARGET ATTRIBUTE
		</label>
		<select
			id="attr-select"
			bind:value={selectedAttributeId}
			class="tw-w-full tw-bg-[#020202] tw-border tw-border-[#00f0ff]/20 tw-rounded-lg tw-px-3 tw-py-2.5 tw-font-mono tw-text-xs tw-text-white/80 tw-tracking-wider tw-outline-none tw-transition-all tw-appearance-none tw-cursor-pointer focus:tw-border-[#00f0ff] focus:tw-shadow-[0_0_15px_rgba(0,240,255,0.2)]"
		>
			{#each attributes as attr (attr.id)}
				<option value={attr.id}>{attr.name}</option>
			{/each}
		</select>
	</div>

	<!-- XP bounty slider -->
	<div class="tw-flex tw-flex-col tw-gap-2">
		<div class="tw-flex tw-justify-between tw-items-center">
			<label
				class="tw-font-mono tw-text-[10px] tw-tracking-widest tw-text-[#00f0ff]/50"
				for="xp-slider"
			>
				TARGET XP BOUNTY
			</label>
			<span class="tw-font-mono tw-text-2xl tw-font-bold tw-text-[#00f0ff]">{targetXp}</span>
		</div>
		<input
			id="xp-slider"
			type="range"
			min="50"
			max="500"
			step="25"
			bind:value={targetXp}
			class="tw-w-full tw-accent-[#00f0ff]"
		/>
		<div class="tw-flex tw-justify-between">
			<span class="tw-font-mono tw-text-[9px] tw-text-white/20">50 XP</span>
			<span class="tw-font-mono tw-text-[9px] tw-text-white/20">500 XP</span>
		</div>
	</div>

	<!-- Flash feedback -->
	{#if flashSuccess}
		<div
			class="tw-w-full tw-py-2.5 tw-px-4 tw-rounded-lg tw-border tw-border-[#00ff66]/40 tw-bg-[#00ff66]/10 tw-text-center"
		>
			<span class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#00ff66]">
				[ ✓ TACTICAL INTENT DEPLOYED ]
			</span>
		</div>
	{:else if flashError}
		<div
			class="tw-w-full tw-py-2.5 tw-px-4 tw-rounded-lg tw-border tw-border-[#ff0055]/40 tw-bg-[#ff0055]/10 tw-text-center"
		>
			<span class="tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#ff0055]">
				[ ⚠ DEPLOYMENT FAILED ]
			</span>
		</div>
	{/if}

	<!-- Deploy CTA -->
	<button
		onclick={deployIntent}
		disabled={isDeploying || flashSuccess}
		class="tw-w-full tw-py-3.5 tw-px-6 tw-rounded-xl tw-border tw-border-[#00f0ff]/40 tw-bg-[#00f0ff]/5 tw-font-mono tw-text-[11px] tw-tracking-widest tw-text-[#00f0ff] tw-uppercase tw-transition-all tw-duration-200 hover:tw-bg-[#00f0ff]/10 hover:tw-shadow-[0_0_15px_rgba(0,240,255,0.4),inset_0_0_8px_rgba(0,240,255,0.2)] disabled:tw-opacity-40 disabled:tw-cursor-not-allowed"
	>
		{isDeploying ? '[ DEPLOYING... ]' : '[ DEPLOY TACTICAL INTENT ]'}
	</button>
</div>
