<script lang="ts">
	export const prerender = true;
</script>

<svelte:head>
	<title>Legal Vault — SSTracker</title>
	<meta name="description" content="SSTracker Legal Vault. Privacy Policy, COPPA, Terms of Service, and EULA." />
</svelte:head>

<!-- MANDATE: Zero-Distraction Layout. Single-column reading environment. Void Black canvas. No gamification. -->
<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#000000] tw-text-[#e2e8f0] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#000000] tw-py-24">

	<main class="tw-max-w-3xl tw-mx-auto tw-w-full tw-px-6">

		<header class="tw-mb-16 tw-text-center">
			<span class="tw-font-mono tw-text-xs tw-font-bold tw-tracking-[0.3em] tw-text-[#64748b] tw-mb-4 tw-block">SYS.LEGAL_VAULT</span>
			<h1 class="tw-text-4xl md:tw-text-5xl tw-font-bold tw-text-[#f8fafc] tw-tracking-tight tw-mb-6">Legal & Compliance</h1>
			<p class="tw-text-[#94a3b8] tw-text-sm tw-font-mono">Last Updated: {new Date().toISOString().split('T')[0]}</p>
		</header>

		<article class="tw-prose tw-prose-invert tw-prose-slate tw-max-w-none">

			<section class="tw-mb-16">
				<h2 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-border-b tw-border-[#1e293b] tw-pb-4 tw-mb-6">1. Privacy Policy</h2>
				<p class="tw-text-[#cbd5e1] tw-leading-relaxed tw-mb-4">
					SSTracker is committed to safeguarding your privacy. We enforce strict Zero-Trust security protocols to protect all operational telemetry and PII.
				</p>
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-6 tw-font-mono tw-text-xs tw-text-[#64748b]">
					[PRIVACY_POLICY_CONTENT_PLACEHOLDER]
				</div>
			</section>

			<section class="tw-mb-16">
				<h2 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-border-b tw-border-[#1e293b] tw-pb-4 tw-mb-6">2. Children's Privacy Policy (COPPA)</h2>
				<p class="tw-text-[#cbd5e1] tw-leading-relaxed tw-mb-4">
					We adhere to the Vanguard Protocol for COPPA 2.0 compliance. Parental consent is cryptographically verified via WebAuthn, ensuring absolute data sovereignty for minors.
				</p>
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-6 tw-font-mono tw-text-xs tw-text-[#64748b]">
					[COPPA_CONTENT_PLACEHOLDER]
				</div>
			</section>

			<section class="tw-mb-16">
				<h2 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-border-b tw-border-[#1e293b] tw-pb-4 tw-mb-6">3. Terms of Service</h2>
				<p class="tw-text-[#cbd5e1] tw-leading-relaxed tw-mb-4">
					By deploying the SSTracker operating system, you agree to our brutalist operational guidelines and automated transaction fee structures.
				</p>
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-6 tw-font-mono tw-text-xs tw-text-[#64748b]">
					[TOS_CONTENT_PLACEHOLDER]
				</div>
			</section>

			<section class="tw-mb-16">
				<h2 class="tw-text-2xl tw-font-bold tw-text-[#f8fafc] tw-border-b tw-border-[#1e293b] tw-pb-4 tw-mb-6">4. End User License Agreement (EULA)</h2>
				<p class="tw-text-[#cbd5e1] tw-leading-relaxed tw-mb-4">
					This EULA governs your use of the Nexus Command interfaces, Sideline SIEM, and Player HUDs.
				</p>
				<div class="tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-p-6 tw-font-mono tw-text-xs tw-text-[#64748b]">
					[EULA_CONTENT_PLACEHOLDER]
				</div>
			</section>

		</article>

	</main>
</div>
