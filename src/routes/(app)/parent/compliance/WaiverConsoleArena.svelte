<script lang="ts">
	import { WaiverController } from './WaiverController.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	const controller = new WaiverController();

	let ipInput = $state('127.0.0.1'); // programmatic capture or default value
	let emailInput = $state(authStore.user?.email || '');
	let emailVerified = $state(false);

	$effect(() => {
		if (authStore.user?.email) {
			emailInput = authStore.user.email;
		}
	});

	async function handleSignOff() {
		if (!emailInput) {
			controller.error = 'Email verification is required.';
			return;
		}
		if (!emailVerified) {
			controller.error = 'You must check the box to verify your email and consent.';
			return;
		}
		await controller.submitWaiver(emailInput, ipInput);
	}
</script>

<div class="waiver-console-arena tw-h-[100dvh] tw-overflow-hidden tw-bg-[#0B0F19] tw-text-white tw-p-6 tw-flex tw-flex-col tw-items-center tw-justify-center">
	<div class="waiver-wrapper tw-max-w-2xl tw-w-full tw-bg-[#0F172A] tw-border tw-border-[#1E293B] tw-p-8 tw-rounded-[24px] tw-shadow-2xl">
		<div class="tw-flex tw-items-center tw-justify-center tw-gap-2 tw-mb-2">
			<Icon name={"status.shield-check" as IconName} size={24} class="tw-text-amber-500" />
			<h1 class="tw-text-2xl tw-font-bold tw-tracking-tight tw-text-center tw-uppercase tw-text-white" style="font-family: 'Geist Sans', sans-serif;">
				SPORT-HAZARD LIABILITY WAIVER
			</h1>
		</div>
		<h2 class="tw-text-xs tw-text-amber-500 tw-font-mono tw-uppercase tw-tracking-widest tw-mb-6 tw-text-center">
			Assumption of Risk & Media Release // TIER-0 CLEARANCE
		</h2>

		<!-- Document Viewer -->
		<div class="document-viewer tw-border tw-border-[#1E293B] tw-bg-[#0B0F19] tw-p-5 tw-h-64 tw-overflow-y-scroll tw-text-sm tw-text-slate-300 tw-leading-relaxed tw-mb-6 tw-rounded-2xl">
			<h3 class="tw-font-bold tw-text-white tw-mb-2 tw-flex tw-items-center tw-gap-2">
				<Icon name={"sys.info" as IconName} size={14} class="tw-text-[#14b8a6]" />
				<span>1. ASSUMPTION OF RISK</span>
			</h3>
			<p class="tw-mb-4 tw-text-slate-400">
				By signing this document, I acknowledge that soccer involves inherent risks, including but not limited to sprains, fractures, concussions, and other physical injuries. I voluntarily assume all risks associated with participation in any training sessions, matches, and platform-tracked activities.
			</p>
			<h3 class="tw-font-bold tw-text-white tw-mb-2 tw-flex tw-items-center tw-gap-2">
				<Icon name={"status.shield-alert" as IconName} size={14} class="tw-text-[#14b8a6]" />
				<span>2. LIABILITY WAIVER</span>
			</h3>
			<p class="tw-mb-4 tw-text-slate-400">
				I hereby release, waive, and forever discharge Vanguard Platform, its directors, coaches, and affiliates from any and all liability, claims, or demands arising out of any injury, loss, or damage sustained during participation, whether caused by negligence or otherwise.
			</p>
			<h3 class="tw-font-bold tw-text-white tw-mb-2 tw-flex tw-items-center tw-gap-2">
				<Icon name={"content.film" as IconName} size={14} class="tw-text-[#14b8a6]" />
				<span>3. MEDIA & VIDEO RELEASE</span>
			</h3>
			<p class="tw-mb-4 tw-text-slate-400">
				Vanguard Platform provides livestreaming (Fan OS) and video trial analysis (Player OS). Participation is optional. By opting in below, you authorize the collection, broadcasting, and algorithmic analysis of video recordings of your athlete. You can customize these options below.
			</p>
			<p class="tw-text-xs tw-text-slate-500 tw-font-mono">
				E-Sign Act compliance: Under federal law, your electronic signature on this document is as legally binding as a physical signature.
			</p>
		</div>

		<!-- Granular Video Consent Switches -->
		<div class="granular-switches tw-border-t tw-border-b tw-border-[#1E293B] tw-py-4 tw-mb-6 tw-space-y-4">
			<div class="switch-item tw-flex tw-items-start tw-justify-between">
				<div class="tw-min-w-0">
					<label for="fan-os-switch" class="tw-font-bold tw-text-sm tw-text-white tw-flex tw-items-center tw-gap-2">
						<Icon name={"comm.broadcast" as IconName} size={14} class="tw-text-[#14b8a6]" />
						<span>Fan OS Livestreaming Module</span>
					</label>
					<p class="tw-text-xs tw-text-slate-400">Allow broadcasting training sessions and match telemetries to validated spectators.</p>
				</div>
				<input
					id="fan-os-switch"
					type="checkbox"
					bind:checked={controller.fanOsOptIn}
					class="tw-form-checkbox tw-h-5 tw-w-5 tw-text-[#14b8a6] tw-rounded-none tw-bg-black tw-border-[#334155] focus:tw-ring-0"
				/>
			</div>

			<div class="switch-item tw-flex tw-items-start tw-justify-between">
				<div class="tw-min-w-0">
					<label for="player-os-switch" class="tw-font-bold tw-text-sm tw-text-white tw-flex tw-items-center tw-gap-2">
						<Icon name={"content.film" as IconName} size={14} class="tw-text-[#14b8a6]" />
						<span>Player OS Video Trial Module</span>
					</label>
					<p class="tw-text-xs tw-text-slate-400">Enable upload and algorithmic AI analysis of skill video trials.</p>
				</div>
				<input
					id="player-os-switch"
					type="checkbox"
					bind:checked={controller.playerOsOptIn}
					class="tw-form-checkbox tw-h-5 tw-w-5 tw-text-[#14b8a6] tw-rounded-none tw-bg-black tw-border-[#334155] focus:tw-ring-0"
				/>
			</div>
		</div>

		<!-- E-Sign Audit Trail Captures -->
		{#if controller.success}
			<div class="tw-bg-[#0B0F19] tw-border tw-border-amber-500/40 tw-p-5 tw-rounded-none tw-mb-6">
				<p class="tw-text-amber-500 tw-font-bold tw-font-mono tw-text-sm tw-mb-3 tw-flex tw-items-center tw-gap-2">
					<Icon name={"status.seal-check" as IconName} size={18} class="tw-text-amber-500" />
					<span>WAIVER SIGNED & SECURED IN COMPLIANCE VAULT</span>
				</p>
				<div class="tw-text-xs tw-font-mono tw-text-slate-300 tw-space-y-1.5">
					<p><strong class="tw-text-slate-400">Signee Email:</strong> {emailInput}</p>
					<p><strong class="tw-text-slate-400">Signed At:</strong> {controller.signedAt}</p>
					<p><strong class="tw-text-slate-400">Audit Trail IP:</strong> {ipInput}</p>
					<p class="tw-break-all"><strong class="tw-text-slate-400">Audit Signature:</strong> {controller.auditSignature}</p>
				</div>
			</div>
		{:else}
			<div class="audit-captures tw-space-y-4 tw-mb-6">
				<div>
					<label for="email-input" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-slate-400 tw-mb-1 tw-uppercase">
						Email Verification
					</label>
					<input
						id="email-input"
						type="email"
						bind:value={emailInput}
						placeholder="parent@example.com"
						class="tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-p-2.5 tw-font-mono tw-text-sm tw-text-white focus:tw-border-[#14b8a6] focus:tw-outline-none tw-rounded-none"
					/>
				</div>

				<div>
					<label for="ip-display" class="tw-block tw-text-xs tw-font-mono tw-font-bold tw-text-slate-400 tw-mb-1 tw-uppercase">
						IP Address Capture
					</label>
					<input
						id="ip-display"
						type="text"
						bind:value={ipInput}
						placeholder="e.g. 192.168.1.1"
						class="tw-w-full tw-bg-[#0B0F19] tw-border tw-border-[#1E293B] tw-p-2.5 tw-font-mono tw-text-sm tw-text-slate-400 focus:tw-outline-none tw-rounded-none"
					/>
				</div>

				<div class="tw-flex tw-items-start tw-gap-3">
					<input
						id="esign-verification"
						type="checkbox"
						bind:checked={emailVerified}
						class="tw-mt-1 tw-h-4 tw-w-4 tw-text-amber-500 tw-bg-black tw-border-[#334155] focus:tw-ring-0 tw-rounded-none"
					/>
					<label for="esign-verification" class="tw-text-xs tw-text-slate-300 tw-leading-relaxed">
						I certify under penalty of perjury that I am the legal guardian associated with the email address {emailInput || 'provided'}, and this electronic sign-off serves as my digital consent under the E-Sign Act.
					</label>
				</div>
			</div>

			{#if controller.error}
				<div class="tw-p-3 tw-mb-4 tw-bg-red-950/30 tw-border tw-border-red-500/30 tw-flex tw-items-center tw-gap-2">
					<Icon name={"status.error" as IconName} size={14} class="tw-text-red-400" />
					<p class="tw-text-red-300 tw-text-xs tw-font-mono">{controller.error}</p>
				</div>
			{/if}

			<button
				type="button"
				onclick={handleSignOff}
				disabled={controller.loading}
				class="tw-w-full tw-bg-amber-500 tw-text-black tw-font-mono tw-font-bold tw-py-3.5 tw-text-xs tw-tracking-widest tw-uppercase hover:tw-bg-amber-400 tw-transition-all tw-duration-150 disabled:tw-bg-[#1E293B] disabled:tw-text-slate-500 tw-flex tw-items-center tw-justify-center tw-gap-2 tw-rounded-none"
			>
				<Icon name={"status.seal-check" as IconName} size={16} />
				<span>
					{#if controller.loading}
						SECURING CONSENTS...
					{:else}
						SUBMIT IMMUTABLE SIGN-OFF
					{/if}
				</span>
			</button>
		{/if}
	</div>
</div>
