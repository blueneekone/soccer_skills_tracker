<script lang="ts">
	import { WaiverController } from './WaiverController.svelte';
	import { authStore } from '$lib/stores/auth/facade.svelte.js';

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

<div class="waiver-console-arena tw-min-h-screen tw-bg-[#000000] tw-text-white tw-p-6 tw-flex tw-flex-col tw-items-center">
	<div class="waiver-wrapper tw-max-w-2xl tw-w-full tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-8 tw-rounded-none tw-shadow-2xl">
		<h1 class="tw-text-2xl tw-font-bold tw-mb-4 tw-tracking-tight tw-text-center">SPORT-HAZARD LIABILITY WAIVER</h1>
		<h2 class="tw-text-xs tw-text-[#94a3b8] tw-uppercase tw-tracking-widest tw-mb-6 tw-text-center">Assumption of Risk & Media Release</h2>

		<!-- Document Viewer -->
		<div class="document-viewer tw-border tw-border-[#334155] tw-bg-[#080808] tw-p-4 tw-h-64 tw-overflow-y-scroll tw-text-sm tw-text-[#cbd5e1] tw-leading-relaxed tw-mb-6">
			<h3 class="tw-font-bold tw-mb-2">1. ASSUMPTION OF RISK</h3>
			<p class="tw-mb-4">
				By signing this document, I acknowledge that soccer involves inherent risks, including but not limited to sprains, fractures, concussions, and other physical injuries. I voluntarily assume all risks associated with participation in any training sessions, matches, and platform-tracked activities.
			</p>
			<h3 class="tw-font-bold tw-mb-2">2. LIABILITY WAIVER</h3>
			<p class="tw-mb-4">
				I hereby release, waive, and forever discharge Vanguard Platform, its directors, coaches, and affiliates from any and all liability, claims, or demands arising out of any injury, loss, or damage sustained during participation, whether caused by negligence or otherwise.
			</p>
			<h3 class="tw-font-bold tw-mb-2">3. MEDIA & VIDEO RELEASE</h3>
			<p class="tw-mb-4">
				Vanguard Platform provides livestreaming (Fan OS) and video trial analysis (Player OS). Participation is optional. By opting in below, you authorize the collection, broadcasting, and algorithmic analysis of video recordings of your athlete. You can customize these options below.
			</p>
			<p class="tw-text-xs tw-text-[#64748b]">
				E-Sign Act compliance: Under federal law, your electronic signature on this document is as legally binding as a physical signature.
			</p>
		</div>

		<!-- Granular Video Consent Switches -->
		<div class="granular-switches tw-border-t tw-border-b tw-border-[#334155] tw-py-4 tw-mb-6 tw-space-y-4">
			<div class="switch-item tw-flex tw-items-start tw-justify-between">
				<div class="tw-min-w-0">
					<label for="fan-os-switch" class="tw-font-bold tw-text-sm">Fan OS Livestreaming Module</label>
					<p class="tw-text-xs tw-text-[#94a3b8]">Allow broadcasting training sessions and match telemetries to validated spectators.</p>
				</div>
				<input
					id="fan-os-switch"
					type="checkbox"
					bind:checked={controller.fanOsOptIn}
					class="tw-form-checkbox tw-h-5 tw-w-5 tw-text-cyan-500 tw-rounded tw-bg-black tw-border-[#334155] focus:tw-ring-0"
				/>
			</div>

			<div class="switch-item tw-flex tw-items-start tw-justify-between">
				<div class="tw-min-w-0">
					<label for="player-os-switch" class="tw-font-bold tw-text-sm">Player OS Video Trial Module</label>
					<p class="tw-text-xs tw-text-[#94a3b8]">Enable upload and algorithmic AI analysis of skill video trials.</p>
				</div>
				<input
					id="player-os-switch"
					type="checkbox"
					bind:checked={controller.playerOsOptIn}
					class="tw-form-checkbox tw-h-5 tw-w-5 tw-text-cyan-500 tw-rounded tw-bg-black tw-border-[#334155] focus:tw-ring-0"
				/>
			</div>
		</div>

		<!-- E-Sign Audit Trail Captures -->
		{#if controller.success}
			<div class="tw-bg-[#1e293b] tw-border tw-border-cyan-500/30 tw-p-4 tw-rounded-none tw-mb-6">
				<p class="tw-text-green-400 tw-font-bold tw-text-sm tw-mb-2 tw-flex tw-items-center">
					✓ WAIVER SIGNED & SECURED
				</p>
				<div class="tw-text-xs tw-font-mono tw-text-[#94a3b8] tw-space-y-1">
					<p><strong>Signee Email:</strong> {emailInput}</p>
					<p><strong>Signed At:</strong> {controller.signedAt}</p>
					<p><strong>Audit Trail IP:</strong> {ipInput}</p>
					<p class="tw-break-all"><strong>Audit Signature:</strong> {controller.auditSignature}</p>
				</div>
			</div>
		{:else}
			<div class="audit-captures tw-space-y-4 tw-mb-6">
				<div>
					<label for="email-input" class="tw-block tw-text-xs tw-font-bold tw-text-[#94a3b8] tw-mb-1 uppercase">Email Verification</label>
					<input
						id="email-input"
						type="email"
						bind:value={emailInput}
						placeholder="parent@example.com"
						class="tw-w-full tw-bg-black tw-border tw-border-[#334155] tw-p-2 tw-text-sm tw-text-white focus:tw-border-cyan-500 focus:tw-outline-none"
					/>
				</div>

				<div>
					<label for="ip-display" class="tw-block tw-text-xs tw-font-bold tw-text-[#94a3b8] tw-mb-1 uppercase">IP Address Capture</label>
					<input
						id="ip-display"
						type="text"
						bind:value={ipInput}
						placeholder="e.g. 192.168.1.1"
						class="tw-w-full tw-bg-black tw-border tw-border-[#334155] tw-p-2 tw-text-sm tw-text-[#64748b] focus:tw-outline-none"
					/>
				</div>

				<div class="tw-flex tw-items-start">
					<input
						id="esign-verification"
						type="checkbox"
						bind:checked={emailVerified}
						class="tw-mt-1 tw-mr-3 tw-h-4 tw-w-4 tw-text-cyan-500 tw-bg-black tw-border-[#334155] focus:tw-ring-0"
					/>
					<label for="esign-verification" class="tw-text-xs tw-text-[#cbd5e1] tw-leading-relaxed">
						I certify under penalty of perjury that I am the legal guardian associated with the email address {emailInput || 'provided'}, and this electronic sign-off serves as my digital consent under the E-Sign Act.
					</label>
				</div>
			</div>

			{#if controller.error}
				<p class="tw-text-red-500 tw-text-xs tw-mb-4 tw-font-mono">{controller.error}</p>
			{/if}

			<button
				type="button"
				onclick={handleSignOff}
				disabled={controller.loading}
				class="tw-w-full tw-bg-white tw-text-black tw-font-bold tw-py-3 tw-text-sm hover:tw-bg-gray-200 transition-colors duration-150 disabled:tw-bg-[#334155] disabled:tw-text-[#64748b]"
			>
				{#if controller.loading}
					SECURING CONSENTS...
				{:else}
					SUBMIT IMMUTABLE SIGN-OFF
				{/if}
			</button>
		{/if}
	</div>
</div>
