<script>
	/** @type {{ clubId?: string }} */
	let { clubId: _clubId = '' } = $props();
</script>

<div class="hct-root">
	<div class="hct-banner">
		<div class="hct-banner__icon" aria-hidden="true">
			<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
				<path d="M18 3L33 10.5V18C33 25.455 26.505 32.085 18 34.5C9.495 32.085 3 25.455 3 18V10.5L18 3Z" stroke="#00f0ff" stroke-width="1.5" stroke-linejoin="round" fill="rgba(0,240,255,0.06)"/>
				<path d="M13 18L16.5 21.5L23 14" stroke="#00f0ff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</div>

		<div class="hct-banner__body">
			<p class="hct-banner__eyebrow">AUTONOMOUS CLEARANCE PROTOCOL · ACTIVE</p>
			<h2 class="hct-banner__title">Zero-Entry Compliance Engine Online</h2>
			<p class="hct-banner__desc">
				COPPA attestation, date-of-birth verification, and household clearance are now handled
				entirely through the automated <strong>On-Device WebAuthn Biometric Enclave</strong> flow.
				Manual data entry has been permanently decommissioned from this interface.
			</p>

			<div class="hct-flow">
				<div class="hct-flow__step">
					<span class="hct-flow__num">01</span>
					<div>
						<p class="hct-flow__label">GENERATE TEAM UPLINK</p>
						<p class="hct-flow__sub">Director issues a time-locked cryptographic QR key via the Uplink Terminal below.</p>
					</div>
				</div>
				<div class="hct-flow__arrow" aria-hidden="true">▼</div>
				<div class="hct-flow__step">
					<span class="hct-flow__num">02</span>
					<div>
						<p class="hct-flow__label">GUARDIAN SELF-REGISTERS</p>
						<p class="hct-flow__sub">Parent scans QR, creates account, inputs player DOB, and completes on-device biometric attestation.</p>
					</div>
				</div>
				<div class="hct-flow__arrow" aria-hidden="true">▼</div>
				<div class="hct-flow__step">
					<span class="hct-flow__num">03</span>
					<div>
						<p class="hct-flow__label">NODE MATERIALIZES IN PANOPTICON</p>
						<p class="hct-flow__sub">Cleared players auto-unlock. Exceptions surface in the Intake Panopticon for pitch-side override only.</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.hct-root {
		width: 100%;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	.hct-banner {
		display: flex;
		align-items: flex-start;
		gap: 1.5rem;
		padding: 2rem;
		border-radius: 16px;
		border: 1px solid rgba(0, 240, 255, 0.18);
		background: linear-gradient(135deg, rgba(0, 240, 255, 0.04) 0%, rgba(1, 4, 9, 0.95) 60%);
		backdrop-filter: blur(36px);
		-webkit-backdrop-filter: blur(36px);
		box-shadow:
			0 0 40px rgba(0, 240, 255, 0.05),
			inset 0 1px 1px rgba(255, 255, 255, 0.04);
	}

	.hct-banner__icon {
		flex-shrink: 0;
		margin-top: 2px;
		filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.5));
	}

	.hct-banner__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	.hct-banner__eyebrow {
		margin: 0;
		font-size: 0.55rem;
		font-weight: 900;
		letter-spacing: 0.22em;
		color: rgba(0, 240, 255, 0.55);
		text-transform: uppercase;
	}

	.hct-banner__title {
		margin: 0;
		font-size: clamp(1rem, 2vw, 1.2rem);
		font-weight: 900;
		letter-spacing: -0.02em;
		color: #e2e8f0;
		line-height: 1.2;
	}

	.hct-banner__desc {
		margin: 0;
		font-size: 0.72rem;
		line-height: 1.7;
		color: rgba(226, 232, 240, 0.55);
		letter-spacing: 0.02em;
	}

	.hct-banner__desc strong {
		color: rgba(0, 240, 255, 0.85);
		font-weight: 700;
	}

	/* Flow diagram */
	.hct-flow {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: 0.5rem;
		border: 1px solid rgba(0, 240, 255, 0.1);
		border-radius: 10px;
		overflow: hidden;
	}

	.hct-flow__step {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.85rem 1rem;
		background: rgba(0, 240, 255, 0.025);
		transition: background 0.2s;
	}

	.hct-flow__step:hover {
		background: rgba(0, 240, 255, 0.05);
	}

	.hct-flow__num {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 1px solid rgba(0, 240, 255, 0.3);
		background: rgba(0, 240, 255, 0.07);
		font-size: 0.55rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		color: #00f0ff;
		text-shadow: 0 0 8px rgba(0, 240, 255, 0.6);
	}

	.hct-flow__label {
		margin: 0 0 2px;
		font-size: 0.6rem;
		font-weight: 900;
		letter-spacing: 0.16em;
		color: rgba(226, 232, 240, 0.8);
		text-transform: uppercase;
	}

	.hct-flow__sub {
		margin: 0;
		font-size: 0.58rem;
		line-height: 1.6;
		color: rgba(226, 232, 240, 0.35);
		letter-spacing: 0.02em;
	}

	.hct-flow__arrow {
		padding: 0 1rem 0 calc(28px + 2rem);
		font-size: 0.55rem;
		color: rgba(0, 240, 255, 0.25);
		border-left: none;
		background: rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
	}

	@media (max-width: 600px) {
		.hct-banner {
			flex-direction: column;
			gap: 1rem;
			padding: 1.25rem;
		}
	}
</style>
