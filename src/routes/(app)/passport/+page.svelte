<script>
	import { onMount } from 'svelte';
	import { auth, db } from '$lib/firebase.js';
	import { doc, getDoc, setDoc } from 'firebase/firestore';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const profile = $derived(authStore.userProfile);

	let emergencyName = $state('');
	let emergencyPhone = $state('');
	let medicalNotes = $state('');
	let clearanceStatus = $state('CLEARED');
	let hasSignedWaiver = $state(false);
	let saving = $state(false);

	// Signature canvas
	let sigCanvas;
	let sigCtx;
	let isSigBlank = $state(true);
	let isDrawing = false;

	const statusConfig = $derived({
		'RED_CARD': { label: '🟥 SUSPENDED (Red Card)', bg: '#fef2f2', border: '#ef4444', color: '#b91c1c' },
		'PENDING_SAFESPORT': { label: '🟨 PENDING SAFESPORT', bg: '#fffbeb', border: '#fbbf24', color: '#b45309' },
		'CLEARED': { label: '✅ CLEARED TO PLAY', bg: '#f0fdf4', border: '#10b981', color: '#047857' }
	}[clearanceStatus] || { label: '✅ CLEARED TO PLAY', bg: '#f0fdf4', border: '#10b981', color: '#047857' });

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
		} catch (e) { console.error('Error loading passport', e); }
	};

	const savePassport = async () => {
		if (!emergencyName || !emergencyPhone) return alert('Emergency contact name and phone are required.');
		if (isSigBlank) return alert('You must sign the liability waiver.');
		saving = true;
		try {
			await setDoc(doc(db, 'passports', auth.currentUser.email.toLowerCase()), {
				emergencyName,
				emergencyPhone,
				medicalNotes,
				hasSignedWaiver: true,
				waiverSignedAt: new Date()
			}, { merge: true });
			alert('Passport & Waiver securely saved!');
			await loadPassport();
		} catch (e) {
			alert('Error saving passport: ' + e.message);
		} finally {
			saving = false;
		}
	};

	// Canvas
	const resizeCanvas = () => {
		if (!sigCanvas?.parentElement?.offsetWidth) return;
		sigCanvas.width = sigCanvas.parentElement.offsetWidth;
		sigCanvas.height = 140;
		sigCtx = sigCanvas.getContext('2d');
		sigCtx.lineWidth = 2; sigCtx.lineCap = 'round'; sigCtx.strokeStyle = '#00263A';
	};

	const getCoords = (e) => {
		const rect = sigCanvas.getBoundingClientRect();
		return {
			x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
			y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
		};
	};
	const startDraw = (e) => { isDrawing = true; sigCtx.beginPath(); drawOn(e); };
	const endDraw = () => { isDrawing = false; isSigBlank = false; };
	const drawOn = (e) => {
		if (!isDrawing) return; e.preventDefault();
		const { x, y } = getCoords(e);
		sigCtx.lineTo(x, y); sigCtx.stroke(); sigCtx.beginPath(); sigCtx.moveTo(x, y);
	};
	const clearSig = () => { sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); isSigBlank = true; };

	onMount(() => {
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		loadPassport();
		return () => window.removeEventListener('resize', resizeCanvas);
	});
</script>

<div class="view-section">
	<h2 class="view-title">🛂 Player Passport</h2>

	<!-- Clearance Status -->
	<div class="card border-green">
		<div class="card-header bg-green-header">Official Clearance Status</div>
		<div class="card-body text-center">
			<div
				class="passport-status-badge"
				style="background:{statusConfig.bg}; border-color:{statusConfig.border}; color:{statusConfig.color}; font-size:1.5rem; font-weight:900; padding:15px; border-radius:12px; border:2px solid; display:inline-block;"
			>
				{statusConfig.label}
			</div>
			<p class="text-sm-sub" style="margin-top:12px;">This status is controlled by your Club Director. A Green "Cleared" status is required to participate in official matches.</p>
		</div>
	</div>

	<!-- Medical Info -->
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

	<!-- Waiver -->
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

			<label>Parent/Guardian Digital Signature</label>
			<div class="signature-canvas-container">
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<canvas
					bind:this={sigCanvas}
					class="signature-canvas"
					onmousedown={startDraw} onmouseup={endDraw} onmousemove={drawOn} onmouseout={endDraw}
					ontouchstart={startDraw} ontouchend={endDraw} ontouchmove={drawOn}
					role="img" aria-label="Signature canvas"
				></canvas>
				<button class="clear-sig-btn" onclick={clearSig}>✕ Clear</button>
			</div>

			<button class="primary-btn btn-green w-100" onclick={savePassport} disabled={saving}>
				{saving ? 'Saving Securely...' : '💾 Securely Sign & Save Passport'}
			</button>
		</div>
	</div>
</div>

<style>
	input, textarea {
		margin-bottom: 12px;
	}
</style>
