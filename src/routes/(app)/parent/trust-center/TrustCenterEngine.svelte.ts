import { authStore } from '$lib/stores/auth.svelte.js';
import { getActiveDb } from '$lib/firebase.js';
import { query, collection, where, onSnapshot } from 'firebase/firestore';
import { browser } from '$app/environment';

export class TrustCenterEngine {
	shadowCcLogs = $state<any[]>([]);
	vpcStatus = $state<'pending' | 'attested' | 'error'>('pending');
	bountyAmount = $state<number>(0);
	private unsubLogs: (() => void) | null = null;

	init() {
		if (!browser) return;
		const db = getActiveDb();
		if (!db || !authStore.isAuthenticated) return;
		
		const uid = authStore.userProfile?.uid;
		if (!uid) return;

		const q = query(
			collection(db, 'communications'),
			where('ccParentUids', 'array-contains', uid)
		);

		this.unsubLogs = onSnapshot(q, (snap) => {
			this.shadowCcLogs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
		});
	}

	destroy() {
		if (this.unsubLogs) {
			this.unsubLogs();
			this.unsubLogs = null;
		}
	}

	async initiateBiometricConsent() {
		if (!browser || !window.PublicKeyCredential) {
			alert('Biometrics are not supported on this device.');
			return;
		}

		const challenge = new Uint8Array(32);
		window.crypto.getRandomValues(challenge);

		try {
			const credential = await navigator.credentials.create({
				publicKey: {
					challenge: challenge,
					rp: { name: 'SSTracker Co-op Trust Center' },
					user: {
						id: new Uint8Array(16),
						name: authStore.userProfile?.email || 'parent',
						displayName: 'Parent Attestation'
					},
					pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
					authenticatorSelection: {
						authenticatorAttachment: 'platform',
						userVerification: 'required'
					},
					timeout: 60000,
					attestation: 'direct'
				}
			});

			if (credential) {
				this.vpcStatus = 'attested';
			}
		} catch (err) {
			console.error('Biometric attestation failed', err);
			this.vpcStatus = 'error';
		}
	}

	fundBounty() {
		if (this.bountyAmount <= 0) return;
		alert(`Funded $${this.bountyAmount} to Escrow. This will release upon CV-verified workout.`);
		this.bountyAmount = 0;
	}
}
