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

	let sigCanvas = $state.raw(null);
	let sigCtx = null;
	let isSigBlank = $state(true);
	let isDrawing = false;

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
		if (!isMinorPlayer && isSigBlank) {
			alert('You must sign the liability waiver.');
			return;
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
				await setDoc(
					doc(db, 'passports', email),
					{
						...base,
						hasSignedWaiver: true,
						waiverSignedAt: new Date()
					},
					{ merge: true }
				);
				alert('Passport & waiver securely saved!');
			}
			await loadPassport();
		} catch (e) {
			alert('Error saving passport: ' + e.message);
		} finally {
			saving = false;
		}
	};

	const resizeCanvas = () => {
		if (!sigCanvas?.parentElement?.offsetWidth) return;
		sigCanvas.width = sigCanvas.parentElement.offsetWidth;
		sigCanvas.height = 140;
		sigCtx = sigCanvas.getContext('2d');
		sigCtx.lineWidth = 2;
		sigCtx.lineCap = 'round';
		sigCtx.strokeStyle = '#00263A';
	};

	const getCoords = (e) => {
		const rect = sigCanvas.getBoundingClientRect();
		return {
			x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
			y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
		};
	};
	const startDraw = (e) => {
		isDrawing = true;
		sigCtx.beginPath();
		drawOn(e);
	};
	const endDraw = () => {
		isDrawing = false;
		isSigBlank = false;
	};
	const drawOn = (e) => {
		if (!isDrawing) return;
		e.preventDefault();
		const { x, y } = getCoords(e);
		sigCtx.lineTo(x, y);
		sigCtx.stroke();
		sigCtx.beginPath();
		sigCtx.moveTo(x, y);
	};
	const clearSig = () => {
		sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
		isSigBlank = true;
	};

	$effect(() => {
		if (!isMinorPlayer) {
			resizeCanvas();
		}
	});

	onMount(() => {
		(async () => {
			if (auth.currentUser) {
				try {
					await getIdTokenResult(auth.currentUser, true);
					await authStore.refresh();
				} catch (_) {
					/* ignore */
				}
			}
			await loadPassport();
		})();
		window.addEventListener('resize', resizeCanvas);
		return () => window.removeEventListener('resize', resizeCanvas);
	});
</script>

<div class="view-section">
	<h2 class="view-title">🛂 Player Passport</h2>

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

	<div class="card">
		<div class="card-header bg-red-header">Season Liability Waiver</div>
		<div class="card-body">
			<div class="waiver-text-box">
				<strong>RELEASE OF LIABILITY AND ASSUMPTION OF RISK</strong><br /><br />
				By signing below, I acknowledge that soccer is a physical sport that carries inherent risks of injury.
				I agree to hold the club, its directors, coaches, and SSTRACKER harmless from any liability, claims,
				or demands arising from my child's participation in training or matches.<br /><br />
				I certify that the medical information provided above is accurate and I authorize the coaching staff
				to seek emergency medical treatment if necessary.
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
							For athletes under 13, a digital canvas signature is not used. Your parent or guardian must
							complete verifiable parental consent through your club. You can still save medical and emergency
							information above.
						</p>
					{/if}
				</div>
			{:else}
				<label>Parent/Guardian Digital Signature</label>
				<div class="signature-canvas-container">
					<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
					<canvas
						bind:this={sigCanvas}
						class="signature-canvas"
						onmousedown={startDraw}
						onmouseup={endDraw}
						onmousemove={drawOn}
						onmouseout={endDraw}
						ontouchstart={startDraw}
						ontouchend={endDraw}
						ontouchmove={drawOn}
						role="img"
						aria-label="Signature canvas"
					></canvas>
					<button type="button" class="clear-sig-btn" onclick={clearSig}>✕ Clear</button>
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
		border-color: #ef4444;
		color: #b91c1c;
	}

	.status-amber {
		background: #fffbeb;
		border-color: #fbbf24;
		color: #b45309;
	}

	.status-green {
		background: #f0fdf4;
		border-color: #10b981;
		color: #047857;
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
		color: #b45309;
	}

	.minor-ok {
		margin: 0;
		line-height: 1.5;
		color: #047857;
	}
</style>
