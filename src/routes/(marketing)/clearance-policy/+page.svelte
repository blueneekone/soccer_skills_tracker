<script>
	// Phase 2, Epic 2 — Session N.  Public-facing explainer of the Vanguard
	// Clearance Protocol.  Linked from the recruiter pricing card and from
	// the in-app /compliance terminal so adults entering the platform see
	// the rationale BEFORE they hit the Checkr embed.
</script>

<svelte:head>
	<title>Clearance Policy — Vanguard Protocol</title>
	<meta
		name="description"
		content="Why Vanguard requires a background check for every adult who can touch minor-athlete data."
	/>
</svelte:head>

<main class="cp-root">
	<header class="cp-hero">
		<p class="cp-eyebrow">Vanguard Clearance Protocol</p>
		<h1 class="cp-title">Adults touching minor data must clear a background check.</h1>
		<p class="cp-lede">
			Vanguard is built around minor athletes — kids in the U-9 to U-18 range.
			Every adult role that can read or write minor-athlete data is screened
			by Checkr before access unlocks.  The result is a "cleared" badge on
			your account, valid for 12 months.
		</p>
	</header>

	<section class="cp-card">
		<h2>Who's in scope</h2>
		<p>
			The clearance gate applies to every adult role that interacts with
			minor PII.  Players and parents manage their own data and are
			never in scope.
		</p>
		<ul>
			<li><strong>Coach</strong> — manages a team roster, runs drills, reads evaluations.</li>
			<li><strong>Recruiter</strong> — searches the verified talent graph and exports contacts.</li>
			<li><strong>Director</strong> — administers club operations, household linkages, and compliance.</li>
			<li><strong>Tutor</strong> — runs 1-to-1 training sessions logged against minor profiles.</li>
		</ul>
	</section>

	<section class="cp-card">
		<h2>How it works</h2>
		<ol>
			<li>
				After sign-up, your adult-role profile is routed to the Compliance
				Terminal.  Until you clear, no minor data is reachable from your
				account.
			</li>
			<li>
				Vanguard hands the verification off to <strong>Checkr</strong>.  Your
				identity, SSN, and payment data are entered <em>inside Checkr's
				encrypted iframe</em>.  They never enter Vanguard.
			</li>
			<li>
				Checkr returns one of four statuses: <code>clear</code>,
				<code>consider</code>, <code>suspended</code>, or <code>pending</code>.
				Only <code>clear</code> unlocks your account.
			</li>
			<li>
				Vanguard stamps your auth token with an <code>isCleared</code>
				claim so server rules and the client app instantly recognise the
				new state.
			</li>
			<li>
				Clearances are valid for <strong>365 days</strong>.  A daily sweep
				re-locks accounts whose clearance has elapsed and prompts a
				re-screen.
			</li>
		</ol>
	</section>

	<section class="cp-card">
		<h2>Data we store</h2>
		<p>
			A deliberate, zero-trust minimum: just enough to know who's cleared and
			when to expire them.
		</p>
		<ul>
			<li>Clearance status (<code>pending</code> · <code>cleared</code> · <code>flagged</code> · <code>expired</code>)</li>
			<li>The Checkr candidate ID (an opaque reference, not PII)</li>
			<li>Timestamps: when last verified, when cleared, when it expires</li>
		</ul>
		<p>
			We <em>never</em> store SSNs, dates of birth, criminal records, or
			payment details.  Those live with Checkr.
		</p>
	</section>

	<section class="cp-card">
		<h2>Why we do this</h2>
		<p>
			The U.S. Center for SafeSport and most youth-sports governing bodies
			require background-screened adults for any contact-level role.
			Vanguard's clearance protocol is the systems-level enforcement of
			that requirement — adults can't move through the platform to reach
			minor data without it.
		</p>
		<p>
			It's also a one-way ratchet for the platform's brand.  Every
			Cleared badge you see on the platform is auditable — directors and
			recruiters know that the names on a team page have already passed
			through a third-party screen.
		</p>
	</section>

	<footer class="cp-footer">
		<a class="cp-cta" href="/pricing">Back to pricing</a>
	</footer>
</main>

<style>
	.cp-root {
		max-width: 56rem;
		margin: 0 auto;
		padding: clamp(2rem, 4vw, 4rem) clamp(1rem, 3vw, 2rem) 5rem;
		display: flex;
		flex-direction: column;
		gap: clamp(1.5rem, 3vw, 2.4rem);
		color: var(--text-primary, #f8fafc);
	}

	.cp-hero {
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.cp-eyebrow {
		margin: 0;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 10px;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--brand-primary, #14b8a6);
	}

	.cp-title {
		margin: 0;
		font-size: clamp(1.6rem, 3.4vw, 2.4rem);
		font-weight: 900;
		letter-spacing: -0.015em;
		line-height: 1.15;
	}

	.cp-lede {
		margin: 0;
		font-size: clamp(0.95rem, 1.4vw + 0.4rem, 1.05rem);
		line-height: 1.55;
		color: var(--muted-slate, rgba(148, 163, 184, 0.85));
		max-width: 56ch;
	}

	.cp-card {
		padding: clamp(1.1rem, 1.8vw, 1.6rem);
		border-radius: 24px;
		border: 1px solid var(--vanguard-border, rgba(20, 184, 166, 0.18));
		background: linear-gradient(135deg, rgba(8, 17, 28, 0.78), rgba(2, 6, 12, 0.92));
		backdrop-filter: blur(var(--vanguard-blur, 24px));
		-webkit-backdrop-filter: blur(var(--vanguard-blur, 24px));
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.04) inset,
			0 18px 48px rgba(2, 6, 12, 0.4);
	}

	.cp-card h2 {
		margin: 0 0 0.6rem;
		font-size: clamp(1.1rem, 1.4vw + 0.5rem, 1.35rem);
		font-weight: 900;
		letter-spacing: -0.01em;
	}

	.cp-card p,
	.cp-card li {
		font-size: 0.95rem;
		line-height: 1.55;
		color: rgba(226, 232, 240, 0.92);
	}

	.cp-card p + p,
	.cp-card p + ul {
		margin-top: 0.6rem;
	}

	.cp-card ul,
	.cp-card ol {
		margin: 0;
		padding-left: 1.2rem;
	}

	.cp-card li + li {
		margin-top: 0.32rem;
	}

	.cp-card code {
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.85em;
		padding: 0.05rem 0.32rem;
		border-radius: 6px;
		background: rgba(20, 184, 166, 0.08);
		color: var(--brand-primary, #14b8a6);
	}

	.cp-footer {
		display: flex;
		justify-content: center;
		padding-top: 1rem;
	}

	.cp-cta {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.7rem 1.2rem;
		border-radius: 14px;
		border: 1px solid var(--vanguard-border, rgba(20, 184, 166, 0.32));
		background: rgba(1, 4, 9, 0.55);
		color: var(--text-primary, #f8fafc);
		font-weight: 800;
		font-size: 0.95rem;
		text-decoration: none;
	}

	.cp-cta:hover {
		border-color: var(--brand-primary, #14b8a6);
		box-shadow: 0 6px 14px rgba(20, 184, 166, 0.18);
	}
</style>
