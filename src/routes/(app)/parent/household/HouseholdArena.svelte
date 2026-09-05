<script lang="ts">
	import type { HouseholdEngine } from './HouseholdEngine.svelte.js';
	import Icon from '$lib/components/ui/Icon.svelte';
	import IntelModal from '$lib/components/ui/IntelModal.svelte';
	import ParentPrivacyDashboard from '$lib/components/compliance/ParentPrivacyDashboard.svelte';
	import TransferPortal from '$lib/components/player/TransferPortal.svelte';
	import type { IconName } from '$lib/icons/registry.js';

	interface Props {
		engine: HouseholdEngine;
	}
	let { engine }: Props = $props();

	const DISPATCH_CODE_INTEL = {
		title: 'DISPATCH CODES',
		instructions: [
			'1. A Dispatch Code securely links your player to their official team roster.',
			'2. Head Coaches generate these secure codes and text them to parents.',
			'3. If you do not have a code, please ask your coach before continuing.',
		],
	};
</script>

<svelte:head>
	<title>Household · Clearance · SSTRACKER</title>
</svelte:head>

<svelte:window onkeydown={engine.onOtpKeydown} />

<div
	class="pd-page-root household-graph phh parent-lounge-page tw-mx-auto tw-w-full tw-max-w-5xl"
	style="padding-bottom: env(safe-area-inset-bottom, 0px);"
	data-region="household-clearance"
>
	<header class="phh-page-head bento-mb-lg">
		<div class="tw-text-center">
			<p class="phh-eyebrow tw-mb-1">Parent OS · TIER-0 ACCESS</p>
			<h1 class="phh-title tw-mb-2 tw-text-xl tw-font-extrabold tw-tracking-tight tw-text-white md:tw-text-2xl">
				Household Clearance Center
			</h1>
			<p class="tw-mx-auto tw-max-w-prose tw-text-sm tw-text-[var(--text-secondary)]">
				Classified provisioning. Minors do not self-register. Digital signatures and dispatch codes
				are the only valid ingress paths.
			</p>
		</div>
	</header>

	{#if engine.loadErr}
		<div
			class="bento-mb-md tw-border tw-border-red-500/50 tw-bg-red-950/30 tw-px-4 tw-py-3 tw-text-sm tw-text-red-200"
			role="alert"
		>
			{engine.loadErr}
		</div>
	{/if}

	<div
		class="bento-grid-container bento-grid--12col bento-grid--liquid tw-min-h-0 tw-w-full lg:tw-grid-cols-12 tw-font-mono"
		style="grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
	>
		<!-- 8-Column Primary Canvas -->
		<div class="bento-col-8 lg:tw-col-span-8 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
			<!-- COPPA & liability block -->
			<section
				class="st-bento phh-surface parent-lounge-z2-panel parent-lounge-z2-panel--warn tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5 vanguard-panel"
				aria-labelledby="phh-coppa"
			>
				<div class="tw-mb-3 tw-flex tw-flex-col tw-gap-1">
					<span class="phh-eyebrow tw-text-red-400/90">COPPA &amp; LIABILITY</span>
					<h2 id="phh-coppa" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-red-200 tw-font-mono">
						Minor accounts locked
					</h2>
				</div>
				<p class="bento-mb-md tw-text-sm tw-leading-relaxed tw-text-[var(--text-secondary)]">
					Until you execute the digital signature below, child operative accounts in this household
					remain <span class="tw-font-semibold tw-text-red-200">inert (no self-initiation)</span>.
					By signing, you assert parental authority to provision credentials per club policy and
					federal child-privacy law.
				</p>
				<div
					class="phh-row tw-mb-3 tw-flex tw-min-h-[3.25rem] tw-flex-col tw-gap-1 tw-border tw-border-white/10 tw-bg-black/60 tw-px-3 tw-py-2.5 sm:tw-flex-row sm:tw-items-center sm:tw-justify-between"
				>
					<span class="phh-eyebrow">Clearance file</span>
					<div class="tw-text-right">
						{#if engine.coppaSigned}
							<span class="phh-mono tw-text-cyan-300">SIGNED</span>
							<div class="phh-mono tw-text-xs tw-text-[var(--text-secondary)]">{engine.fmtTs(engine.coppaAt)}</div>
						{:else if engine.loadBusy}
							<span class="phh-mono tw-text-[var(--text-muted)]">SCANNING…</span>
						{:else}
							<span class="phh-mono tw-text-amber-400">PENDING SIGNATURE</span>
						{/if}
					</div>
				</div>
				<p class="phh-eyebrow tw-mb-2">Household / club line</p>
				<div class="phh-mono tw-mb-3 tw-text-xs tw-break-all tw-text-[var(--text-secondary)]">
					HH: {engine.householdId || '— (created on sign)'} · Club: {engine.profile?.clubId ? String(engine.profile.clubId) : '—'}
				</div>
				<button
					type="button"
					class="phh-btn btn-vanguard tw-w-full tw-min-h-[3.25rem] tw-px-4 tw-text-base tw-font-extrabold tw-uppercase tw-tracking-widest tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-font-mono"
					class:phh-btn--dim={engine.coppaSigned}
					disabled={engine.coppaSigned || engine.actionBusy}
					onclick={() => engine.signWaiver()}
				>
					<Icon name={"status.seal-check" as IconName} size={18} class="tw-text-amber-500" />
					<span>{engine.coppaSigned ? 'Waiver on file' : 'Sign waiver & authorize'}</span>
				</button>
			</section>

			<!-- Linked operatives — ephemeral OTP login -->
			{#if engine.operativeRows.length > 0}
				<section
					class="st-bento phh-surface parent-lounge-z2-panel tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5 vanguard-panel"
					aria-labelledby="phh-active-ops"
				>
					<div class="tw-mb-3">
						<span class="phh-eyebrow tw-text-cyan-200/80">Household roster</span>
						<h2
							id="phh-active-ops"
							class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white tw-font-mono"
						>
							Active operatives
						</h2>
					</div>
					<p class="tw-mb-3 tw-text-xs tw-leading-relaxed tw-text-[var(--text-secondary)]">
						Issue a 10-minute clearance code your athlete can enter with their Operative Callsign on
						the login page.
					</p>
					<ul class="tw-m-0 tw-list-none bento-stack-sm tw-p-0">
						{#each engine.operativeRows as row (row.email)}
							<li
								class="tw-flex tw-min-w-0 tw-flex-col tw-gap-2 tw-border tw-border-white/10 tw-bg-black/50 tw-px-3 tw-py-3 glass-panel"
							>
								<div class="tw-min-w-0">
									<p class="phh-mono tw-m-0 tw-text-sm tw-font-bold tw-text-cyan-100/90">
										{row.name}
									</p>
									{#if row.email.endsWith('@operative.local')}
										<div class="phh-cmd-hud tw-mt-2 tw-border tw-border-cyan-500/20 tw-bg-black/60 tw-px-2 tw-py-2">
											<p class="phh-eyebrow tw-mb-0.5 !tw-text-[0.5rem] tw-text-cyan-200/60">
												Login Callsign
											</p>
											<p class="phh-cmd-callsign phh-mono tw-m-0 tw-text-lg tw-font-black tw-text-cyan-200 sm:tw-text-xl">
												{row.loginCallsign || '—'}
											</p>
											<p
												class="phh-mono tw-m-0 tw-mt-1 tw-text-[0.65rem] tw-break-all tw-text-[var(--text-muted)]"
											>
												{row.email}
											</p>
											<div class="tw-mt-2 tw-flex tw-flex-wrap tw-items-baseline tw-gap-2">
												<span class="phh-eyebrow !tw-m-0 !tw-text-[0.5rem]">Dispatch</span>
												{#if row.hudErr}
													<span class="phh-mono tw-text-xs tw-text-amber-300/80">{row.hudErr}</span>
												{:else if row.dispatchCode}
													<span
														class="phh-mono tw-text-sm tw-font-bold tw-tracking-widest tw-text-[#7dff9a] tw-font-mono"
														>{row.dispatchCode}</span
													>
												{:else}
													<span class="phh-mono tw-text-xs tw-text-[var(--text-muted)]">—</span>
												{/if}
											</div>
										</div>
										{#if row.pendingGamertag}
											<div
												class="phh-gt-queue tw-mt-2 tw-border tw-border-amber-500/50 tw-bg-amber-950/20 tw-px-2.5 tw-py-2.5"
												role="status"
											>
												<p
													class="phh-eyebrow tw-mb-1 !tw-text-[0.55rem] tw-text-amber-200/90"
												>
													Action required
												</p>
												<p class="tw-m-0 tw-text-xs tw-leading-relaxed tw-text-amber-50/90">
													Operative requested a new Gamertag: <span class="tw-font-semibold"
														>{row.pendingGamertag}</span
													>. They have
													<span class="tw-font-semibold">{row.gamertagChangesLeft}</span> changes
													remaining.
												</p>
												<div
													class="tw-mt-2 tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center"
												>
													<button
														type="button"
														class="phh-gt-approve tw-inline-flex tw-items-center tw-gap-1.5 btn-vanguard"
														disabled={!engine.coppaSigned ||
															engine.gtActionBusyKey !== null ||
															engine.actionBusy ||
															row.gamertagChangesLeft <= 0}
														onclick={() => engine.approveGamertagForRow(row)}
													>
														<Icon name={"status.check" as IconName} size={12} />
														<span>{engine.gtActionBusyKey === row.email ? '…' : 'Approve'}</span>
													</button>
													<button
														type="button"
														class="phh-gt-deny tw-inline-flex tw-items-center tw-gap-1.5 btn-vanguard"
														disabled={!engine.coppaSigned || engine.gtActionBusyKey !== null || engine.actionBusy}
														onclick={() => engine.denyGamertagForRow(row)}
													>
														<Icon name={"sys.close" as IconName} size={12} />
														<span>{engine.gtActionBusyKey === row.email ? '…' : 'Deny'}</span>
													</button>
												</div>
											</div>
										{/if}
										<div
											class="tw-mt-2 tw-border tw-border-cyan-500/25 tw-bg-cyan-950/10 tw-px-2.5 tw-py-2.5"
										>
											<p class="phh-eyebrow tw-mb-1 !tw-text-[0.55rem] tw-text-cyan-200/80">
												Link to team roster
											</p>
											<p class="tw-m-0 tw-mb-2 tw-text-xs tw-leading-relaxed tw-text-[var(--text-secondary)]">
												Enter your coach&apos;s dispatch code (e.g. QA-PP26) to add this operative to
												the team roster for Forge and schedule sync.
											</p>
											<div class="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row sm:tw-items-center">
												<input
													class="phh-input phh-input--cyan tw-min-h-[2.75rem] tw-flex-1"
													type="text"
													autocomplete="off"
													spellcheck="false"
													placeholder="e.g. QA-PP26"
													value={engine.linkTeamCodes[row.email] ?? ''}
													oninput={(e) => {
														engine.linkTeamCodes = {
															...engine.linkTeamCodes,
															[row.email]: e.currentTarget.value,
														};
													}}
												/>
												<button
													type="button"
													class="phh-btn phh-btn--cyan tw-min-h-[2.75rem] tw-shrink-0 tw-px-4 tw-text-xs tw-inline-flex tw-items-center tw-gap-1.5 btn-vanguard"
													disabled={!engine.coppaSigned ||
														engine.linkTeamBusyKey !== null ||
														engine.actionBusy ||
														engine.gtActionBusyKey !== null}
													onclick={() => engine.linkOperativeTeam(row)}
												>
													<Icon name={"sys.plug" as IconName} size={14} />
													<span>{engine.linkTeamBusyKey === row.email ? 'Linking…' : 'Link team'}</span>
												</button>
											</div>
										</div>
									{:else}
										<p class="phh-mono tw-m-0 tw-text-xs tw-text-[var(--text-muted)]">
											{row.callsign ? `Callsign: ${row.callsign}` : row.email}
										</p>
									{/if}
								</div>
								<div class="tw-flex tw-shrink-0 sm:tw-justify-end">
									<button
										type="button"
										class="phh-dispatch-gen tw-w-full sm:tw-w-auto tw-inline-flex tw-items-center tw-justify-center tw-gap-1.5 btn-vanguard"
										disabled={!engine.coppaSigned ||
											engine.otpGenBusyKey !== null ||
											engine.gtActionBusyKey !== null ||
											engine.actionBusy}
										onclick={() => engine.generateOtpForRow(row)}
									>
										<Icon name={"sys.key" as IconName} size={14} class="tw-text-amber-500" />
										<span>{engine.otpGenBusyKey === row.email ? 'Working…' : 'Generate clearance code'}</span>
									</button>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>

		<!-- 4-Column Sidecar -->
		<div class="bento-col-4 lg:tw-col-span-4 tw-flex tw-flex-col tw-gap-6 tw-min-w-0">
			<!-- Operative generation -->
			<section
				class="st-bento phh-surface parent-lounge-z2-panel tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5 vanguard-panel"
				aria-labelledby="phh-ops"
			>
				<div class="tw-mb-3">
					<span class="phh-eyebrow tw-text-cyan-200/80">Operative generation</span>
					<h2 id="phh-ops" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white tw-font-mono">
						Credential dispatch
					</h2>
				</div>
				<p class="bento-mb-md tw-text-sm tw-text-[var(--text-secondary)]">
					Register the minor’s <span class="tw-text-[var(--text-primary)]">legal display name</span> and a unique
					<span class="tw-text-[var(--text-primary)]">Operative Callsign</span> (username for sign-in). A proxy
					account is created automatically. The engine issues a one-time
					<span class="phh-mono tw-text-cyan-300">DISPATCH</span> code for Operative login.
				</p>
				<div class="tw-min-w-0 tw-flex tw-flex-col tw-gap-4">
					<label class="phh-field tw-block tw-w-full">
						<span class="phh-eyebrow tw-mb-1 tw-block">Operative name</span>
						<input
							class="phh-input vanguard-input"
							type="text"
							autocomplete="name"
							placeholder="Full name (minor)"
							bind:value={engine.childName}
						/>
					</label>
					<label class="phh-field tw-block tw-w-full">
						<span class="phh-eyebrow tw-mb-1 tw-block"
							>Operative Callsign <span class="tw-text-red-300/80">(required)</span></span
						>
						<input
							class="phh-input vanguard-input"
							type="text"
							autocomplete="username"
							placeholder="e.g. Red-Fox, striker99"
							bind:value={engine.operativeCallsign}
						/>
					</label>
					<div class="phh-field tw-block tw-w-full md:tw-col-span-2">
						<div class="tw-mb-1 tw-flex tw-items-center tw-gap-2">
							<label
								for="phh-dispatch-code"
								class="phh-eyebrow tw-m-0 tw-block tw-text-cyan-300/80"
							>
								Dispatch Code <span class="tw-text-[var(--text-muted)]">(optional)</span>
							</label>
							<IntelModal
								title={DISPATCH_CODE_INTEL.title}
								instructions={DISPATCH_CODE_INTEL.instructions}
							/>
						</div>
						<input
							id="phh-dispatch-code"
							class="phh-input phh-input--cyan vanguard-input"
							type="text"
							autocomplete="off"
							spellcheck="false"
							placeholder="e.g. AB-1K2M"
							bind:value={engine.teamDispatchCode}
						/>
						<p class="tw-mt-1 tw-text-xs tw-text-slate-400">
							Optional team dispatch code from your coach (e.g. AB-1K2M). Links your operative to the
							roster when you provision credentials.
						</p>
					</div>
				</div>
				<div class="bento-mt-md">
					<button
						type="button"
						class="phh-btn phh-btn--cyan tw-w-full tw-min-h-[3.25rem] tw-px-4 tw-text-base tw-font-extrabold tw-uppercase tw-tracking-widest tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-font-mono btn-vanguard"
						disabled={!engine.coppaSigned || engine.actionBusy}
						onclick={() => engine.provision()}
					>
						<Icon name={"user.plus" as IconName} size={18} />
						<span>Generate operative credentials</span>
					</button>
				</div>
				{#if engine.lastDispatch}
					<div
						class="tw-mt-3 tw-min-w-0 tw-border tw-border-[#2dd4bf]/40 tw-bg-[#05050a] tw-px-3 tw-py-3"
						role="status"
					>
						<p class="phh-eyebrow tw-mb-1 tw-text-[#2dd4bf]">Last dispatch (share once; keep secure)</p>
						<p class="phh-mono tw-break-all tw-text-lg tw-text-[#7dff9a] sm:tw-text-xl">
							{engine.lastDispatch}
						</p>
					</div>
				{/if}
			</section>

            <!-- Co-Parent Invitation -->
            <section
                class="st-bento phh-surface parent-lounge-z2-panel tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5 vanguard-panel"
                aria-labelledby="phh-coparent"
            >
                <div class="tw-mb-3">
                    <span class="phh-eyebrow tw-text-amber-400/80">Household Management</span>
                    <h2 id="phh-coparent" class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white tw-font-mono">
                        Invite Co-Parent
                    </h2>
                </div>
                <p class="bento-mb-md tw-text-sm tw-text-[var(--text-secondary)]">
                    Link a second guardian to this household to manage operatives and view team schedules.
                </p>
                <div class="tw-min-w-0 tw-flex tw-flex-col tw-gap-4">
                    <label class="phh-field tw-block tw-w-full">
                        <span class="phh-eyebrow tw-mb-1 tw-block">Co-Parent Email</span>
                        <input
                            class="phh-input vanguard-input"
                            type="email"
                            autocomplete="email"
                            placeholder="guardian@example.com"
                            bind:value={engine.coParentEmail}
                        />
                    </label>
                </div>
                {#if engine.coParentErr}
                    <div class="tw-mt-2 tw-text-xs tw-text-red-400 tw-font-mono">{engine.coParentErr}</div>
                {/if}
                <div class="bento-mt-md">
                    <button
                        type="button"
                        class="phh-btn tw-w-full tw-min-h-[3.25rem] tw-px-4 tw-text-base tw-font-extrabold tw-uppercase tw-tracking-widest tw-inline-flex tw-items-center tw-justify-center tw-gap-2 tw-font-mono btn-vanguard"
                        style="color: var(--action-gold); border-color: var(--action-gold);"
                        disabled={!engine.coppaSigned || engine.coParentBusy || !engine.coParentEmail}
                        onclick={() => engine.inviteCoParent()}
                    >
                        <Icon name={"action.send" as IconName} size={18} />
                        <span>{engine.coParentBusy ? 'Inviting...' : 'Send Invitation'}</span>
                    </button>
                </div>
            </section>

			<section
				class="st-bento phh-surface parent-lounge-z2-panel tw-min-w-0 tw-px-3 tw-py-4 sm:tw-px-4 md:tw-px-5 vanguard-panel"
				aria-labelledby="phh-transfer"
			>
				<div class="tw-mb-3">
					<span class="phh-eyebrow tw-text-[var(--text-secondary)]">Club transfer</span>
					<h2
						id="phh-transfer"
						class="tw-m-0 tw-text-sm tw-font-bold tw-uppercase tw-tracking-widest tw-text-white tw-font-mono"
					>
						Vanguard transfer protocol
					</h2>
				</div>
				<p class="tw-mb-3 tw-text-xs tw-leading-relaxed tw-text-[var(--text-secondary)]">
					Initiate a player transfer to another club. You will receive a token to share with the
					destination registrar; confirm with their auth code when prompted.
				</p>
				<TransferPortal
					role="parent"
					playerEmail={engine.operativeRows[0]?.email && !engine.operativeRows[0].email.endsWith('@operative.local')
						? engine.operativeRows[0].email
						: ''}
				/>
			</section>
		</div>
	</div>

	{#if engine.actErr}
		<div
			class="bento-mt-md tw-border tw-border-amber-500/50 tw-bg-amber-950/20 tw-px-4 tw-py-3 tw-text-sm tw-text-amber-100"
			role="alert"
		>
			{engine.actErr}
		</div>
	{/if}
</div>

{#if engine.otpDialog !== false}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="phh-otp-backdrop"
		role="presentation"
		onclick={() => engine.closeOtpDialog()}
	>
		<div
			class="phh-otp-panel"
			role="dialog"
			aria-modal="true"
			aria-labelledby="phh-otp-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<p class="phh-eyebrow tw-mb-2 tw-text-cyan-300/80">Clearance code</p>
			<h3 id="phh-otp-title" class="phh-otp-h3 tw-m-0">
				{engine.otpDialog.displayName}
			</h3>
			<p class="phh-mono phh-otp-code tw-my-4 tw-text-center tw-tracking-[0.2em] tw-text-[#7dff9a]">
				{engine.otpDialog.code}
			</p>
			<p class="tw-mb-3 tw-text-center tw-text-xs tw-leading-relaxed tw-text-[var(--text-secondary)]">
				This clearance code expires 10 minutes after it is generated.
			</p>
			<div
				class="phh-otp-ttl bento-mb-md tw-flex tw-items-center tw-justify-center tw-gap-2 tw-text-sm tw-text-cyan-200/80"
			>
				<span class="phh-eyebrow !tw-m-0 tw-text-[0.6rem]">Expires in</span>
				<span class="phh-mono tw-text-lg tw-font-black tw-text-cyan-300 tw-tabular-nums"
					>{engine.otpCountdownLabel}</span
				>
			</div>
			<div class="tw-flex tw-flex-col tw-gap-2 sm:tw-flex-row">
				<button type="button" class="phh-btn phh-btn--cyan phh-otp-btn tw-inline-flex tw-items-center tw-justify-center tw-gap-2 btn-vanguard" onclick={() => engine.copyOtpToClipboard()}>
					<Icon name={"action.copy" as IconName} size={16} />
					<span>{engine.copyFeedback ? 'Copied' : 'Copy to clipboard'}</span>
				</button>
				<button type="button" class="phh-btn phh-otp-btn phh-otp-btn--close btn-vanguard" onclick={() => engine.closeOtpDialog()}
					>Dismiss</button
				>
			</div>
		</div>
	</div>
{/if}

<style>
	:global([data-region='household-clearance'] *) {
		box-sizing: border-box;
	}
	.phh-page-head {
		position: relative;
	}
	.phh-eyebrow {
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.45);
	}
	.phh-title {
		font-family: system-ui, sans-serif;
	}
	.phh-surface {
		background: #05050a;
		box-shadow: var(--shadow-liquid);
		background-image: linear-gradient(
			160deg,
			rgba(255, 255, 255, 0.03) 0%,
			rgba(255, 255, 255, 0) 60%
		);
	}
	.phh-mono {
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
	}
	.phh-input {
		width: 100%;
		min-height: 3.25rem;
		padding: 0.7rem 0.9rem;
		font-size: 1rem;
		touch-action: manipulation;
		border: 1px solid rgba(255, 255, 255, 0.1);
		background: transparent;
		color: #fafafa;
		border-radius: 0.25rem;
	}
	.phh-input::placeholder {
		color: #94a3b8;
	}
	.phh-input:focus {
		outline: 1px solid #00d4ff;
		outline-offset: 1px;
		box-shadow: 0 0 18px rgba(0, 212, 255, 0.2);
	}
	.phh-input--cyan {
		min-height: 3.25rem;
		border: 1px solid rgba(0, 212, 255, 0.45);
		background: transparent;
	}
	.phh-input--cyan:focus {
		outline: 1px solid #00d4ff;
		outline-offset: 1px;
		border-color: rgba(0, 212, 255, 0.7);
		box-shadow: 0 0 20px rgba(0, 212, 255, 0.25);
	}
	.phh-btn {
		background: #000;
		color: #fff;
		border: 1px solid rgba(248, 113, 113, 0.5);
		cursor: pointer;
		transition: box-shadow 0.2s, border-color 0.2s;
	}
	.phh-btn:hover:not(:disabled) {
		box-shadow: 0 0 22px rgba(248, 113, 113, 0.35);
	}
	.phh-btn:disabled,
	.phh-btn--dim:disabled,
	.phh-btn--dim {
		cursor: not-allowed;
		opacity: 0.5;
		box-shadow: none;
	}
	.phh-btn--cyan {
		border-color: rgba(0, 212, 255, 0.45);
		color: #c9f4ff;
	}
	.phh-btn--cyan:hover:not(:disabled) {
		box-shadow: 0 0 22px rgba(0, 212, 255, 0.35);
	}

	.phh-dispatch-gen {
		flex-shrink: 0;
		align-self: stretch;
		padding: 0.55rem 0.75rem;
		font-size: 0.58rem;
		font-weight: 900;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
		color: #67e8f9;
		background: rgba(8, 47, 73, 0.55);
		border: 1px solid rgba(20, 184, 166, 0.45);
		border-radius: 0.2rem;
		cursor: pointer;
		box-shadow: none;
		transition:
			background 0.12s ease,
			border-color 0.12s ease;
	}

	.phh-dispatch-gen:hover:not(:disabled) {
		background: rgba(8, 47, 73, 0.75);
		border-color: rgba(20, 184, 166, 0.65);
	}

	.phh-dispatch-gen:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.phh-cmd-callsign {
		font-variant-ligatures: none;
		letter-spacing: 0.04em;
	}

	.phh-gt-approve,
	.phh-gt-deny {
		min-height: 2.5rem;
		padding: 0.4rem 0.9rem;
		font-size: 0.65rem;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		font-family: ui-monospace, 'Cascadia Code', 'SFMono-Regular', Menlo, Consolas, monospace;
		border-radius: 0.2rem;
		cursor: pointer;
	}
	.phh-gt-approve {
		color: #000000;
		background: #fbbf24;
		border: 1px solid #fbbf24;
		box-shadow: 0 0 12px rgba(251, 191, 36, 0.4);
	}
	.phh-gt-approve:hover:not(:disabled) {
		background: #ebff47;
		box-shadow: 0 0 16px rgba(251, 191, 36, 0.6);
	}
	.phh-gt-approve:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.phh-gt-deny {
		color: #fecaca;
		background: rgba(127, 29, 29, 0.4);
		border: 1px solid rgba(248, 113, 113, 0.45);
	}
	.phh-gt-deny:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.phh-otp-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1300;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.78);
		backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
		-webkit-backdrop-filter: blur(var(--vanguard-blur-sm)) saturate(180%);
	}

	.phh-otp-panel {
		width: 100%;
		max-width: 22rem;
		padding: 1.25rem 1.25rem 1rem;
		border: 1px solid rgba(20, 184, 166, 0.5);
		border-radius: 0.35rem;
		background: #05050a;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 28px rgba(20, 184, 166, 0.12);
	}

	.phh-otp-h3 {
		font-size: 1.05rem;
		font-weight: 800;
		color: #fff;
		letter-spacing: 0.02em;
	}

	.phh-otp-code {
		font-size: clamp(1.5rem, 5vw, 1.9rem);
		font-weight: 800;
		line-height: 1.2;
		text-shadow: 0 0 18px rgba(125, 255, 154, 0.25);
	}

	.phh-otp-ttl {
		font-variant-numeric: tabular-nums;
	}

	.phh-otp-btn {
		min-height: 2.75rem;
		margin: 0;
	}

	.phh-otp-btn--close {
		border-color: rgba(255, 255, 255, 0.2);
		color: rgba(255, 255, 255, 0.8);
	}

	.phh-otp-btn--close:hover {
		border-color: rgba(255, 255, 255, 0.4);
	}

	.phh-privacy-details {
		border: 1px solid rgba(255, 50, 80, 0.15);
		border-radius: 8px;
		overflow: hidden;
	}
	.phh-privacy-summary {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.65rem 1rem;
		background: rgba(255, 50, 80, 0.04);
		cursor: pointer;
		list-style: none;
		font-family: 'JetBrains Mono', monospace;
	}
	.phh-privacy-summary::-webkit-details-marker { display: none; }
	.phh-privacy-label {
		font-size: 0.55rem; font-weight: 700; letter-spacing: 0.2em;
		color: rgba(255, 50, 80, 0.6);
	}
	.phh-privacy-name {
		font-size: 0.72rem; font-weight: 600; color: rgba(255, 255, 255, 0.65);
	}
	.phh-privacy-chevron {
		margin-left: auto; font-size: 0.65rem; color: rgba(255, 255, 255, 0.25);
		transition: transform 0.2s;
	}
	.phh-privacy-details[open] .phh-privacy-chevron { transform: rotate(90deg); }
</style>

{#if engine.operativeRows.length > 0}
	<div class="tw-mx-auto tw-w-full tw-max-w-3xl tw-px-3 tw-pb-6 md:tw-px-6">
		{#each engine.operativeRows as row (row.email)}
			<details class="phh-privacy-details bento-mt-md">
				<summary class="phh-privacy-summary">
					<span class="phh-privacy-label">PRIVACY LOG</span>
					<span class="phh-privacy-name">{row.name || row.email}</span>
					<span class="phh-privacy-chevron" aria-hidden="true">▸</span>
				</summary>
				<div class="tw-mt-2">
					<ParentPrivacyDashboard childEmail={row.email} />
				</div>
			</details>
		{/each}
	</div>
{/if}
