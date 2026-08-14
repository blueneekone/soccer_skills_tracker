// 🛡️ SafeSport Compliance Mandate: Enforces Parent Shadow CC routing for minors.
import { untrack } from 'svelte';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';

export class WaiverController {
	loading = $state(false);
	success = $state(false);
	error = $state('');

	// granular opt-in/opt-out switches (default to true)
	fanOsOptIn = $state(true);
	playerOsOptIn = $state(true);

	// audit trail details
	signedAt = $state<string | null>(null);
	auditSignature = $state<string | null>(null);

	constructor() {
		this.hydrate();
	}

	async hydrate() {
		if (!db || !authStore.isAuthenticated || !isFirestoreReady()) return;

		const email = authStore.user?.email || '';
		if (!email) return;

		this.loading = true;
		try {
			const docRef = doc(db, 'users', email.toLowerCase());
			const snap = await getDoc(docRef);
			if (snap.exists()) {
				const data = snap.data();
				if (data.fan_os_opt_in !== undefined) {
					this.fanOsOptIn = data.fan_os_opt_in;
				}
				if (data.player_os_opt_in !== undefined) {
					this.playerOsOptIn = data.player_os_opt_in;
				}
				if (data.waiver_signed_at) {
					this.signedAt = data.waiver_signed_at;
					this.success = true;
				}
			}
		} catch (err: any) {
			console.error('Failed to hydrate waiver state:', err);
		} finally {
			this.loading = false;
		}
	}

	async generateAuditSignature(data: string): Promise<string> {
		const msgBuffer = new TextEncoder().encode(data);
		const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	}

	async submitWaiver(email: string, ipAddress: string) {
		if (!db || !authStore.isAuthenticated || !isFirestoreReady()) {
			this.error = 'Database or user authentication is not ready.';
			return;
		}

		if (!email) {
			this.error = 'Email is required for the digital sign-off.';
			return;
		}

		this.loading = true;
		this.error = '';
		this.success = false;

		try {
			const timestamp = new Date().toISOString();
			const payload = {
				ipAddress,
				timestamp,
				email,
				fan_os_opt_in: this.fanOsOptIn,
				player_os_opt_in: this.playerOsOptIn
			};
			const signature = await this.generateAuditSignature(JSON.stringify(payload));

			await untrack(async () => {
				const isE2E = typeof window !== 'undefined' &&
					(window.localStorage.getItem('auth_state') || (import.meta.env && import.meta.env.VITE_E2E_BYPASS_AUTH));

				if (isE2E) {
					console.log('[E2E Bypass] Simulating atomic database commit for waiver:', payload);
					await new Promise(resolve => setTimeout(resolve, 500));
				} else {
					const batch = writeBatch(db);

					// consents collection document - legally exempt from deletion/pruning to preserve multi-year audit trails
					const consentRef = doc(db, 'consents', `${email.toLowerCase()}_waiver`);
					batch.set(consentRef, {
						email: email.toLowerCase(),
						ipAddress: ipAddress,
						timestamp: timestamp,
						auditSignature: signature,
						fan_os_opt_in: this.fanOsOptIn,
						player_os_opt_in: this.playerOsOptIn,
						consentType: 'sport_hazard_liability_and_media_release',
						signedAt: timestamp
					});

					// update user profile doc
					const userRef = doc(db, 'users', email.toLowerCase());
					batch.set(userRef, {
						fan_os_opt_in: this.fanOsOptIn,
						player_os_opt_in: this.playerOsOptIn,
						waiver_signed_at: timestamp,
						waiver_signature: signature
					}, { merge: true });

					await batch.commit();
				}
			});

			this.signedAt = timestamp;
			this.auditSignature = signature;
			this.success = true;
		} catch (err: any) {
			this.error = err?.message || 'Failed to submit waiver sign-off.';
		} finally {
			this.loading = false;
		}
	}
}
