<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase.js';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { getIdTokenResult } from 'firebase/auth';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);

	let emergencyName = $state('');
	let emergencyPhone = $state('');
	let medicalNotes = $state('');
	let clearanceStatus = $state('CLEARED');
	let hasSignedWaiver = $state(false);
	let saving = $state(false);

	/** Typed parent/guardian attestation (13+); replaces canvas signature. */
	let attestorLegalName = $state('');
	let waiverAcknowledged = $state(false);

	const statusClass = $derived(
		clearanceStatus === 'RED_CARD'
			? 'status-red'
			: clearanceStatus === 'PENDING_SAFESPORT'
				? 'status-amber'
				: 'status-green'
	);

	const statusLabel = $derived(
		clearanceStatus === 'RED_CARD'
			? '🟥 SUSPENDED (Red Card)'
			: clearanceStatus === 'PENDING_SAFESPORT'
				? '🟨 PENDING SAFESPORT'
				: '✅ CLEARED TO PLAY'
	);

	/** Under-13 athletes: no canvas; VPC + director attestation instead. */
	const isMinorPlayer = $derived.by(() => {
		const p = profile;
		if (!p) return false;
		if (p.isMinor === true) return true;
		if (p.isMinor === false) return false;
		const dob = p.dateOfBirth;
		if (dob && typeof dob.toDate === 'function') {
			const d = dob.toDate();
			const now = new Date();
			let age = now.getFullYear() - d.getFullYear();
			const m = now.getMonth() - d.getMonth();
			if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
				age--;
			}
			return age < 13;
		}
		return false;
	});

	const vpcVerified = $derived(profile?.vpcStatus === 'verified');

	const fullNameOk = (raw) => {
		const parts = raw.trim().split(/\s+/).filter(Boolean);
		return parts.length >= 2 && raw.trim().length >= 4;
	};

	const loadPassport = async () => {
		if (!auth.currentUser) return;
		try {
			const snap = await getDoc(doc(db, 'passports', auth.currentUser.email.toLowerCase()));
			if (snap.exists()) {
				const data = snap.data();
				emergencyName = data.emergencyName || '';
				emergencyPhone = data.emergencyPhone || '';
				medicalNotes = data.medicalNotes || '';
				clearanceStatus = data.clearanceStatus || 'CLEARED';
				hasSignedWaiver = data.hasSignedWaiver || false;
				attestorLegalName = String(data.waiverSignerLegalName || '');
				waiverAcknowledged = hasSignedWaiver;
			}
		} catch (e) {
			console.error('Error loading passport', e);
		}
	};

	const savePassport = async () => {
		if (!emergencyName || !emergencyPhone) {
			alert('Emergency contact name and phone are required.');
			return;
		}
		if (!isMinorPlayer) {
			if (!waiverAcknowledged) {
				alert('Confirm the waiver by checking the acknowledgment box.');
				return;
			}
			if (!fullNameOk(attestorLegalName)) {
				alert('Enter the signing parent or guardian’s full legal name (first and last).');
				return;
			}
		}
		saving = true;
		try {
			const email = auth.currentUser.email.toLowerCase();
			const base = { emergencyName, emergencyPhone, medicalNotes };
			if (isMinorPlayer) {
				await setDoc(doc(db, 'passports', email), base, { merge: true });
				alert(
					'Medical / emergency details saved. The season waiver for minors is completed only after your club records verifiable parental consent (VPC).'
				);
			} else {
				const signer = attestorLegalName.trim().replace(/\s+/g, ' ');
				await setDoc(
					doc(db, 'passports', email),
					{
						...base,
						hasSignedWaiver: true,
						waiverSignedAt: new Date(),
						waiverSignerLegalName: signer,
						waiverMethod: 'typed_parent_attestation'
					},
					{ merge: true }
				);
				alert('Passport & waiver securely saved!');
			}
			await getIdTokenResult(auth.currentUser, true);
			await authStore.refresh({ silent: true });
			await loadPassport();
		} catch (e) {
			alert('Error saving passport: ' + e.message);
		} finally {
			saving = false;
		}
	};

	onMount(() => {
		(async () => {
			if (auth.currentUser) {
				try {
					await getIdTokenResult(auth.currentUser, true);
					await authStore.refresh({ silent: true });
				} catch (_) {
					/* ignore */
				}
			}
			await loadPassport();
		})();
	});
</script>

<div class="view-section">
	<h2 class="view-title">🛂 Player Passport</h2>

	<div class="bento-section">
		<div class="card border-green">
			<div class="card-header bg-green-header">Official Clearance Status</div>
			<div class="card-body text-center">
				<div class="passport-status-badge {statusClass}">
					{statusLabel}
				</div>
				<p class="status-note">
					This status is controlled by your Club Director. A Green "Cleared" status is required to participate in
					official matches.
				</p>
			</div>
		</div>

		<div class="card">
			<div class="card-header">Medical &amp; Emergency Info</div>
			<div class="card-body">
				<label>Emergency Contact Name</label>
				<input type="text" placeholder="e.g. Jane Doe" bind:value={emergencyName} />
				<label>Emergency Contact Phone</label>
				<input type="tel" placeholder="(555) 555-5555" bind:value={emergencyPhone} />
				<label>Known Allergies / Medical Conditions</label>
				<textarea rows="3" placeholder="List any allergies or conditions..." bind:value={medicalNotes}></textarea>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-header bg-red-header">Season Liability Waiver</div>
		<div class="card-body">
			<div class="waiver-text-box">
				<strong>RELEASE OF LIABILITY AND ASSUMPTION OF RISK</strong><br /><br />
				By entering my full legal name below, I acknowledge that soccer is a physical sport that carries inherent
				risks of injury. I agree to hold the club, its directors, coaches, and SSTRACKER harmless from any
				liability, claims, or demands arising from my child’s participation in training or matches.<br /><br />
				I certify that the medical information provided above is accurate and I authorize the coaching staff to
				seek emergency medical treatment if necessary.
			</div>

			{#if isMinorPlayer}
				<div class="minor-waiver-panel">
					{#if vpcVerified && hasSignedWaiver}
						<p class="minor-ok">
							Your club has recorded parental consent. Your waiver is on file. You can update medical details
							above and save.
						</p>
					{:else if vpcVerified}
						<p class="minor-ok">Parental consent is verified. Save this page after medical details are complete.</p>
					{:else}
						<p class="minor-pending">
							For athletes under 13, waiver completion uses verifiable parental consent through your club
							(VPC), not a self-serve signature in the app. You can still save medical and emergency information
							above.
						</p>
					{/if}
				</div>
			{:else}
				<div class="attestation-panel">
					<label class="attest-label" for="waiver-legal-name">Parent / guardian full legal name</label>
					<input
						id="waiver-legal-name"
						class="attest-input"
						type="text"
						autocomplete="name"
						placeholder="First and last name (must match person accepting liability)"
						bind:value={attestorLegalName}
					/>
					<label class="attest-check">
						<input type="checkbox" bind:checked={waiverAcknowledged} />
						<span
							>I have read and agree to the release above. I understand this typed attestation is recorded
							with my account for compliance.</span
						>
					</label>
				</div>
			{/if}

			<button type="button" class="primary-btn btn-green w-100" onclick={savePassport} disabled={saving}>
				{saving ? 'Saving Securely...' : '💾 Save passport'}
			</button>
		</div>
	</div>
</div>

<style>
	input,
	textarea {
		margin-bottom: clamp(10px, 2vw, 12px);
	}

	.passport-status-badge {
		font-size: clamp(1.1rem, 3vw, 1.5rem);
		font-weight: 900;
		padding: clamp(12px, 2.5vw, 15px);
		border-radius: 12px;
		border: 2px solid;
		display: inline-block;
	}

	.status-red {
		background: #fef2f2;
		border-color: #dc2626;
		color: #7f1d1d;
	}

	.status-amber {
		background: #fffbeb;
		border-color: #d97706;
		color: #78350f;
	}

	.status-green {
		background: #ecfdf5;
		border-color: #059669;
		color: #14532d;
	}

	.status-note {
		margin-top: clamp(10px, 2vw, 12px);
		font-size: 0.9rem;
		opacity: 0.9;
		line-height: 1.45;
	}

	.minor-waiver-panel {
		margin-top: clamp(12px, 2vw, 16px);
		padding: clamp(12px, 2vw, 16px);
		border-radius: 12px;
		background: rgba(15, 23, 42, 0.04);
		border: 1px solid rgba(15, 23, 42, 0.08);
	}

	.minor-pending {
		margin: 0;
		line-height: 1.5;
		color: #78350f;
	}

	.minor-ok {
		margin: 0;
		line-height: 1.5;
		color: #14532d;
	}

	:global(html.dark) .status-red {
		background: rgba(254, 226, 226, 0.1);
		border-color: rgba(248, 113, 113, 0.45);
		color: #fecaca;
	}

	:global(html.dark) .status-amber {
		background: rgba(253, 230, 138, 0.1);
		border-color: rgba(251, 191, 36, 0.45);
		color: #fde68a;
	}

	:global(html.dark) .status-green {
		background: rgba(52, 211, 153, 0.1);
		border-color: rgba(52, 211, 153, 0.4);
		color: #6ee7b7;
	}

	:global(html.dark) .minor-waiver-panel {
		background: rgba(241, 245, 249, 0.06);
		border-color: rgba(226, 232, 240, 0.12);
	}

	:global(html.dark) .minor-pending {
		color: #fde68a;
	}

	:global(html.dark) .minor-ok {
		color: #6ee7b7;
	}

	.attestation-panel {
		margin-top: clamp(12px, 2vw, 16px);
		display: flex;
		flex-direction: column;
		gap: clamp(10px, 2vw, 14px);
	}

	.attest-label {
		font-weight: 800;
		font-size: 0.9rem;
	}

	.attest-input {
		width: 100%;
		box-sizing: border-box;
		padding: clamp(10px, 2vw, 14px);
		border-radius: 16px;
		border: 1px solid var(--glass-border);
		font: inherit;
		background: var(--glass-bg);
		color: inherit;
	}

	.attest-check {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		font-size: 0.88rem;
		font-weight: 600;
		line-height: 1.45;
		cursor: pointer;
	}

	.attest-check input {
		margin-top: 4px;
	}
</style>
