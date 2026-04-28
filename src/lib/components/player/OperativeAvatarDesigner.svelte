<script>
	import { browser } from '$app/environment';
	import OperativeAvatarPreview from '$lib/components/player/OperativeAvatarPreview.svelte';
	import {
		normalizeOperativeAvatarSeed,
		OPERATIVE_AVATAR_VERSION,
		parseOperativeAvatar,
	} from '$lib/avatars/operativeAvatar.js';

	let {
		operativeAvatar = $bindable(/** @type {{ v: number, seed: string }} */ ({
			v: OPERATIVE_AVATAR_VERSION,
			seed: `v${OPERATIVE_AVATAR_VERSION}|22|55|38|71`,
		})),
	} = $props();

	const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

	/** @type {number[]} */
	let sliders = $state([22, 55, 38, 71]);

	function slidersToSeed() {
		return `v${OPERATIVE_AVATAR_VERSION}|${sliders[0]}|${sliders[1]}|${sliders[2]}|${sliders[3]}`;
	}

	function applySeedToSliders(s) {
		const m = /^v\d+\|(\d+)\|(\d+)\|(\d+)\|(\d+)$/.exec(String(s).trim());
		if (m) {
			sliders = [+m[1], +m[2], +m[3], +m[4]].map((n) =>
				Math.min(99, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0))),
			);
			return true;
		}
		return false;
	}

	$effect(() => {
		const parsed = parseOperativeAvatar(operativeAvatar);
		if (!parsed) return;
		void applySeedToSliders(parsed.seed);
	});

	function pushDesign() {
		operativeAvatar = {
			v: OPERATIVE_AVATAR_VERSION,
			seed: normalizeOperativeAvatarSeed(slidersToSeed()),
		};
	}

	function randomize() {
		if (!browser) return;
		const next = [];
		const buf = new Uint32Array(4);
		crypto.getRandomValues(buf);
		for (let i = 0; i < 4; i++) {
			next.push(Math.floor((buf[i] / 4294967296) * 100));
		}
		sliders = next;
		pushDesign();
	}

	function glyphPick() {
		if (!browser) return;
		let s = '';
		const buf = new Uint8Array(8);
		crypto.getRandomValues(buf);
		for (let i = 0; i < 8; i++) {
			s += CHARSET[buf[i] % CHARSET.length];
		}
		operativeAvatar = {
			v: OPERATIVE_AVATAR_VERSION,
			seed: normalizeOperativeAvatarSeed(`v${OPERATIVE_AVATAR_VERSION}|${s}`),
		};
	}

	function onSlider(idx, /** @type {number} */ v) {
		const n = Math.min(99, Math.max(0, Math.floor(v)));
		const copy = sliders.slice();
		copy[idx] = n;
		sliders = copy;
		pushDesign();
	}
</script>

<div class="oad-wrap tw-rounded-2xl tw-border tw-border-slate-700 tw-bg-slate-900/60 tw-p-5">
	<div class="tw-flex tw-flex-col tw-gap-6 md:tw-flex-row md:tw-items-start">
		<div class="tw-flex tw-flex-col tw-items-center tw-gap-3">
			<OperativeAvatarPreview seed={operativeAvatar.seed} size={120} />
			<p class="tw-m-0 tw-text-center tw-text-[10px] tw-font-mono tw-uppercase tw-tracking-widest tw-text-slate-500">
				Vector preview · no photo upload
			</p>
		</div>
		<div class="tw-min-w-0 tw-flex-1 tw-space-y-4">
			<p class="tw-m-0 tw-text-sm tw-leading-relaxed tw-text-slate-400">
				Adjust sliders or randomize — only a short text seed is saved (DiceBear illustration;
				no stored images).
			</p>
			<div class="tw-flex tw-flex-wrap tw-gap-2">
				<button
					type="button"
					class="tw-rounded-lg tw-bg-cyan-600 tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide tw-text-white hover:tw-bg-cyan-500"
					onclick={randomize}
				>
					Randomize sliders
				</button>
				<button
					type="button"
					class="tw-rounded-lg tw-border tw-border-slate-600 tw-bg-slate-800 tw-px-3 tw-py-2 tw-text-xs tw-font-bold tw-uppercase tw-tracking-wide tw-text-slate-200 hover:tw-border-slate-500"
					onclick={glyphPick}
				>
					Random codename
				</button>
			</div>
			{#each sliders as sv, i (i)}
				<label class="tw-flex tw-flex-col tw-gap-1">
					<span class="tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wider tw-text-slate-500">
						Tweak {i + 1}
					</span>
					<input
						type="range"
						min="0"
						max="99"
						value={sv}
						oninput={(e) =>
							onSlider(i, Number(/** @type {HTMLInputElement} */ (e.currentTarget).value))}
						class="tw-w-full tw-accent-cyan-500"
					/>
				</label>
			{/each}
		</div>
	</div>
</div>
