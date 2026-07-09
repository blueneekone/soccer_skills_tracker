<svelte:head>
	<title>Privacy Policy — VANGUARD</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="tw-flex tw-w-full tw-min-h-dvh tw-flex-col tw-bg-[#0f172a] tw-text-[#f8fafc] tw-font-sans tw-selection:bg-[#14b8a6] tw-selection:text-[#0f172a]">
<div class="legal-root">
	<div class="legal-scanlines" aria-hidden="true"></div>

	<main class="legal-main">
		<header class="legal-brand">
			<div class="legal-brand__mark" aria-hidden="true">▼</div>
			<div>
				<p class="legal-brand__name">VANGUARD · SOCCER SKILLS TRACKER</p>
				<p class="legal-brand__sub">LEGAL INSTRUMENT · ALPHA REVISION 2026-04</p>
			</div>
		</header>

		<div class="legal-panel">
			<div class="legal-doc-header">
				<span class="legal-doc-badge">PRIVACY POLICY</span>
				<h1 class="legal-doc-title">PRIVACY SHIELD PROTOCOL</h1>
				<p class="legal-doc-subtitle">Last updated: April 2026 · COPPA 2026 Compliant</p>
			</div>

			<div class="legal-body">

				<section class="legal-section">
					<h2 class="legal-h2">1. DATA CONTROLLER IDENTITY</h2>
					<p>VANGUARD Soccer Skills Tracker ("Platform", "we", "us") is the data controller for
					all data processed by this Platform. Each sports club ("Tenant") operating on the Platform
					is a co-data-controller for data belonging to their athletes and staff.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">2. DATA WE COLLECT</h2>
					<p><strong>Account data:</strong> Email address, display name, role, club affiliation.</p>
					<p><strong>Performance data:</strong> Athletic metrics (pace, acceleration, agility, stamina,
					power), training session logs, XP history, skill ratings, and mission completion records.</p>
					<p><strong>Technical data:</strong> IP address (audit events only), device user-agent string,
					page URL at time of specific actions. We do not use persistent cross-site tracking cookies.</p>
					<p><strong>Documents (if uploaded):</strong> Birth certificates, photo IDs, and medical forms
					stored in Firebase Storage under your Tenant's private directory. These are never publicly
					accessible and are only retrievable via director-authenticated signed URLs.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">3. CHILDREN'S PRIVACY (COPPA 2026)</h2>
					<p>We take children's privacy seriously and comply with the Children's Online Privacy
					Protection Act (COPPA). For users under 13:</p>
					<p>• A parent or guardian must complete a verified consent flow before any performance
					data is recorded.</p>
					<p>• Consent is obtained via a unique cryptographic token emailed to the parent-provided
					address. The token is single-use and expires after 72 hours.</p>
					<p>• Every consent event is immutably logged with a server timestamp and the parent's
					IP address for legal audit purposes.</p>
					<p>• Parents may <strong>revoke consent</strong> at any time. Contact your club director
					to initiate data deletion for your child's account.</p>
					<p>• We do not share minors' data with third-party advertisers or marketing platforms.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">4. HOW WE USE YOUR DATA</h2>
					<p>• To provide the Platform's core functionality (performance tracking, mission system,
					leaderboards, progress visualisation).</p>
					<p>• To enable coaches and directors to monitor athlete development within their club.</p>
					<p>• To maintain a security audit trail for COPPA compliance, data access events, and
					identity management changes.</p>
					<p>• We do NOT sell your data, use it for advertising, or share it outside your club
					Tenant without your explicit consent.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">5. DATA ARCHITECTURE & SECURITY</h2>
					<p>All data is partitioned by Tenant ID using Zero-Trust architecture. Firebase Firestore
					Security Rules enforce tenant isolation at the database layer — cross-tenant data access
					is technically blocked, not merely policy-prohibited.</p>
					<p>Sensitive documents are stored with <code class="legal-code">allow read: if false</code>
					on the Storage path. Access requires a director-authenticated Cloud Function call that
					generates a 5-minute signed URL and writes an audit log entry before returning the URL.</p>
					<p>JWT custom claims are the authorisation enforcement layer. Claims are synced server-side
					and cannot be modified by any client.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">6. DATA RETENTION</h2>
					<p>Active accounts retain data for the duration of the athlete's club membership.
					Upon account deletion, personal data is purged within 30 days. Audit logs are retained
					for 7 years per legal compliance requirements. COPPA consent records are retained for
					the child's active membership period plus 3 years.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">7. YOUR RIGHTS</h2>
					<p>Depending on your jurisdiction, you may have the right to:</p>
					<p>• <strong>Access:</strong> Request a copy of your data stored on the Platform.</p>
					<p>• <strong>Correction:</strong> Request correction of inaccurate personal data.</p>
					<p>• <strong>Deletion:</strong> Request deletion of your account and associated data.</p>
					<p>• <strong>COPPA:</strong> Parents may review, correct, or delete data collected from
					their minor child at any time.</p>
					<p>To exercise these rights, contact your club director or the Platform Administrator
					via the in-app messaging system.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">8. THIRD-PARTY SERVICES</h2>
					<p>The Platform uses Google Firebase (Firestore, Authentication, Storage, Cloud Functions)
					for data infrastructure. Firebase is subject to Google's privacy policy and data processing
					terms. For email delivery, the Platform uses the Firebase Trigger Email Extension connected
					to a configured SMTP provider.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">9. ALPHA PROGRAMME DATA</h2>
					<p>During the Alpha phase, bug reports submitted via the "Report Anomaly" tool include
					your user ID, current page URL, and device user agent. This data is used solely for
					platform improvement and is accessible only to Platform Administrators.</p>
				</section>

				<section class="legal-section">
					<h2 class="legal-h2">10. UPDATES TO THIS POLICY</h2>
					<p>We will notify you of material changes to this Privacy Policy via the Platform.
					Continued use of the Platform after notification constitutes acceptance of the revised
					policy. For children under 13, material changes require renewed parental consent.</p>
				</section>

				<section class="legal-section legal-section--highlight">
					<h2 class="legal-h2">11. COPPA 2026 — DATA USE LIMITATION</h2>
					<p>For athletes under 13, data collection is strictly limited to the minimum necessary for
					<strong>athletic development and league administration</strong>. Specifically: we collect
					a chosen display name (real names are optional and not required), an age bracket (not
					full date of birth), team and club affiliation, performance metrics (speed, agility,
					stamina recorded in standardised test formats), and the parent/guardian's email address
					for consent and communication CC purposes. We do not create behavioural profiles, serve
					targeted advertising, share data with talent scouts without explicit opt-in, or retain
					data beyond the athlete's active tenure plus a maximum 2-year archival window.</p>
					<p>Parents have the right to: review all data collected on their child, correct inaccurate
					information, request complete data deletion, and withdraw consent at any time. Withdrawal
					of consent will result in the athlete's account being archived. Deletion requests are
					processed within 30 days and logged in the immutable audit trail.</p>
				</section>

				<section class="legal-section legal-section--highlight">
					<h2 class="legal-h2">12. DATA RETENTION & 24-HOUR BURN POLICY</h2>
					<p>Sensitive verification documents (birth certificates, photo identification, medical
					clearance forms) uploaded to the Platform are subject to the <strong>Vanguard 24-Hour
					PII Burn Protocol</strong>. Once a Club Director verifies a document for league compliance
					purposes, the following sequence is triggered automatically:</p>
					<ol style="margin: 0.5rem 0; padding-left: 1.5em; color: rgba(255,255,255,0.55); font-size: 0.78rem; line-height: 1.8;">
						<li>A <em>DOCUMENT_VERIFIED</em> event is written to the immutable audit log with actor identity, timestamp, and document type.</li>
						<li>The file is marked for deletion with a 24-hour countdown timer visible to the Club Director.</li>
						<li>The file is permanently and irreversibly deleted from Firebase Storage within 24 hours.</li>
						<li>A <em>DOCUMENT_BURNED</em> event is written to the audit log as proof of deletion.</li>
					</ol>
					<p>The verified status flag (not the file content) is retained indefinitely as proof of
					compliance for league audits. Parents can view the full burn log for their child via the
					Privacy Dashboard in the Parent Portal.</p>
				</section>

				<section class="legal-section legal-section--highlight">
					<h2 class="legal-h2">13. SAFESPORT COMMUNICATION RULES</h2>
					<p>In compliance with the <strong>U.S. Center for SafeSport</strong> standards and youth
					protection best practices, the Platform enforces the following communication rules:</p>
					<ul style="margin: 0.5rem 0; padding-left: 1.5em; color: rgba(255,255,255,0.55); font-size: 0.78rem; line-height: 1.8;">
						<li><strong>No 1-on-1 messaging to minors.</strong> Coaches may only send team or group broadcasts. Individual direct messages to players under 18 are blocked at the platform level.</li>
						<li><strong>Automatic parent CC.</strong> Any team message where one or more recipients are under 13 automatically copies the registered parent or guardian on the communication.</li>
						<li><strong>Immutable message log.</strong> All broadcasts are logged with a cryptographic SHA-256 hash of the message body. Logs cannot be edited or deleted.</li>
						<li><strong>Sender role enforcement.</strong> Only registered coaches, directors, and platform administrators may send team messages. Athletes and parents cannot initiate broadcasts.</li>
					</ul>
					<p>These rules are enforced at both the client (UI) and server (Cloud Function) levels as
					part of our Zero-Trust architecture. Circumventing these controls is a violation of the
					Terms of Service and may be reported to relevant SafeSport authorities.</p>
				</section>

			</div>

			<footer class="legal-footer">
				<a href="/terms" class="legal-footer__link">Terms of Service</a>
				<span class="legal-footer__sep">·</span>
				<a href="/login" class="legal-footer__link">Return to Login</a>
			</footer>
		</div>
	</main>
</div>
</div>

<style>
	.legal-root {
		min-height: 100dvh;
		background: transparent;
		position: relative;
		padding: clamp(6rem, 10vw, 7.5rem) clamp(1rem, 4vw, 2rem) clamp(3rem, 6vw, 5rem);
	}

	.legal-scanlines {
		position: fixed;
		inset: 0;
		pointer-events: none;
		background: repeating-linear-gradient(
			0deg, transparent, transparent 2px,
			rgba(20, 184, 166, 0.012) 2px, rgba(20, 184, 166, 0.012) 4px
		);
		z-index: 0;
	}

	.legal-main {
		position: relative;
		z-index: 1;
		max-width: 720px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.legal-brand {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0;
	}

	.legal-brand__mark { font-size: 1.2rem; color: rgba(20, 184, 166, 0.5); }

	.legal-brand__name {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.18em;
		color: rgba(20, 184, 166, 0.6);
	}

	.legal-brand__sub {
		margin: 0.2rem 0 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.55rem;
		letter-spacing: 0.1em;
		color: rgba(255, 255, 255, 0.2);
	}

	.legal-panel {
		background: #0B0F19;
		border: 1px solid #1e293b;
		border-radius: 14px;
		overflow: hidden;
	}

	.legal-doc-header {
		padding: 2rem 2rem 1.5rem;
		background: rgba(20, 184, 166, 0.03);
		border-bottom: 1px solid #1e293b;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.legal-doc-badge {
		display: inline-block;
		padding: 2px 10px;
		background: rgba(20, 184, 166, 0.1);
		border: 1px solid rgba(20, 184, 166, 0.25);
		border-radius: 4px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.2em;
		color: #14b8a6;
		align-self: flex-start;
	}

	.legal-doc-title {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.5rem;
		font-weight: 900;
		letter-spacing: 0.06em;
		color: #ffffff;
	}

	.legal-doc-subtitle {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.3);
		letter-spacing: 0.06em;
	}

	.legal-body {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 1.75rem;
	}

	.legal-section { display: flex; flex-direction: column; gap: 0.6rem; }
	.legal-section--highlight {
		border-left: 2px solid #f59e0b;
		padding-left: 1rem;
		background: rgba(245, 158, 11, 0.02);
	}

	.legal-h2 {
		margin: 0;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.16em;
		color: #14b8a6;
		padding-bottom: 0.4rem;
		border-bottom: 1px solid rgba(20, 184, 166, 0.1);
	}

	.legal-body p {
		margin: 0;
		font-size: 0.83rem;
		line-height: 1.75;
		color: rgba(255, 255, 255, 0.5);
	}

	.legal-body strong { color: rgba(255, 255, 255, 0.75); font-weight: 600; }

	.legal-code {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.75rem;
		color: rgba(20, 184, 166, 0.6);
		background: rgba(20, 184, 166, 0.06);
		padding: 0 4px;
		border-radius: 3px;
	}

	.legal-footer {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 1.25rem;
		border-top: 1px solid #1e293b;
	}

	.legal-footer__link {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.65rem;
		color: rgba(20, 184, 166, 0.45);
		text-decoration: none;
		letter-spacing: 0.08em;
		transition: color 0.15s;
	}

	.legal-footer__link:hover { color: rgba(20, 184, 166, 0.8); }
	.legal-footer__sep { color: rgba(255, 255, 255, 0.15); font-size: 0.65rem; }
</style>
