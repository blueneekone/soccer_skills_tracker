<script>
	import { httpsCallable } from 'firebase/functions';
	import { functions } from '$lib/firebase.js';
	import { authStore } from '$lib/stores/auth.svelte.js';

	let { clubId = '' } = $props();

	const linkHousehold = httpsCallable(functions, 'linkHousehold');
	const setPlayerDateOfBirth = httpsCallable(functions, 'setPlayerDateOfBirth');
	const verifyVpcForMinor = httpsCallable(functions, 'verifyVpcForMinor');

	let parentEmailsInput = $state('');
	let playerEmailsInput = $state('');
	let existingHouseholdId = $state('');
	let busy = $state('');

	let dobPlayerEmail = $state('');
	let dobValue = $state('');

	let vpcPlayerEmail = $state('');

	const canUse = $derived(
		authStore.role === 'director' || authStore.role === 'super_admin'
	);

	const parseEmails = (raw) =>
		raw
			.split(/[\s,;]+/)
			.map((s) => s.trim().toLowerCase())
			.filter(Boolean);

	const onLinkHousehold = async () => {
		const parentEmails = parseEmails(parentEmailsInput);
		const playerEmails = parseEmails(playerEmailsInput);
		if (parentEmails.length < 1 || playerEmails.length < 1) {
			alert('Enter at least one parent and one player email.');
			return;
		}
		busy = 'link';
		try {
			const payload = {
				parentEmails,
				playerEmails,
				...(existingHouseholdId.trim() ? { householdId: existingHouseholdId.trim() } : {}),
				...(authStore.role === 'super_admin' && clubId ? { clubId } : {})
			};
			const res = await linkHousehold(payload);
			const d = res.data;
			alert(
				`Household linked.\nID: ${d.householdId}\nClub: ${d.clubId}\nUsers must refresh login or wait for token sync for household claims.`
			);
		} catch (e) {
			alert(e.message || String(e));
		} finally {
			busy = '';
		}
	};

	const onSetDob = async () => {
		const playerEmail = dobPlayerEmail.trim().toLowerCase();
		if (!playerEmail || !dobValue) {
			alert('Player email and date of birth are required.');
			return;
		}
		busy = 'dob';
		try {
			const res = await setPlayerDateOfBirth({ playerEmail, dateOfBirth: dobValue });
			const d = res.data;
			alert(
				`Date of birth saved for ${d.playerEmail}.\nMinor: ${d.isMinor}\nvpcStatus: ${d.vpcStatus}`
			);
		} catch (e) {
			alert(e.message || String(e));
		} finally {
			busy = '';
		}
	};

	const onVerifyVpc = async () => {
		const playerEmail = vpcPlayerEmail.trim().toLowerCase();
		if (!playerEmail) {
			alert('Enter the minor player email.');
			return;
		}
		if (
			!confirm(
				'Record verifiable parental consent for this minor? This attests the waiver in the system (use only after your club’s VPC process).'
			)
		) {
			return;
		}
		busy = 'vpc';
		try {
			await verifyVpcForMinor({ playerEmail });
			alert(
				'VPC recorded. The player should refresh the session (reload app) so passport rules see updated claims.'
			);
		} catch (e) {
			alert(e.message || String(e));
		} finally {
			busy = '';
		}
	};
</script>

<div class="household-compliance">
	{#if !canUse}
		<p class="muted">You do not have permission to use household tools.</p>
	{:else}
		<div class="card">
			<div class="card-header bg-blue-header">Link parent ↔ minor (household)</div>
			<div class="card-body">
				<p class="help">
					Enter parent/guardian emails and minor player account emails. Every account must already exist in
					<code>users</code> and share the same club. Application admins may link across clubs by ensuring
					members match; directors are limited to their club.
				</p>
				<label>Parent / guardian emails (comma or space separated)</label>
				<input type="text" bind:value={parentEmailsInput} placeholder="parent@example.com" />

				<label>Minor player emails</label>
				<input type="text" bind:value={playerEmailsInput} placeholder="player@example.com" />

				<label>Optional existing household ID (merge members)</label>
				<input type="text" bind:value={existingHouseholdId} placeholder="Leave blank to create new" />

				<button
					class="primary-btn btn-blue w-100"
					onclick={onLinkHousehold}
					disabled={busy !== ''}
				>
					{busy === 'link' ? 'Linking…' : 'Link household'}
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-orange-header">Player date of birth (COPPA)</div>
			<div class="card-body">
				<p class="help">
					Sets <code>dateOfBirth</code>, derives <code>isMinor</code> (under 13) and initial
					<code>vpcStatus</code>. Minors require VPC before waiver attestation.
				</p>
				<label>Player email</label>
				<input type="email" bind:value={dobPlayerEmail} placeholder="minor@example.com" />

				<label>Date of birth</label>
				<input type="date" bind:value={dobValue} />

				<button
					class="primary-btn btn-orange w-100"
					onclick={onSetDob}
					disabled={busy !== ''}
				>
					{busy === 'dob' ? 'Saving…' : 'Save date of birth'}
				</button>
			</div>
		</div>

		<div class="card">
			<div class="card-header bg-green-header">Complete VPC + waiver (minor)</div>
			<div class="card-body">
				<p class="help">
					Run only after parental consent is verified per your club policy. Updates Firestore and passport
					waiver fields via trusted backend; replaces canvas signature for under-13 athletes.
				</p>
				<label>Minor player email</label>
				<input type="email" bind:value={vpcPlayerEmail} placeholder="minor@example.com" />

				<button
					class="primary-btn btn-green w-100"
					onclick={onVerifyVpc}
					disabled={busy !== ''}
				>
					{busy === 'vpc' ? 'Recording…' : 'Record VPC &amp; attest waiver'}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.household-compliance {
		display: flex;
		flex-direction: column;
		gap: clamp(16px, 3vw, 24px);
	}
	label {
		display: block;
		margin-top: clamp(8px, 1.5vw, 12px);
		margin-bottom: clamp(4px, 0.8vw, 6px);
	}
	input {
		width: 100%;
		margin-bottom: 0;
	}
	.help {
		font-size: 0.9rem;
		opacity: 0.9;
		margin: 0 0 clamp(8px, 1.2vw, 12px) 0;
		line-height: 1.45;
	}
	.muted {
		opacity: 0.85;
	}
</style>
