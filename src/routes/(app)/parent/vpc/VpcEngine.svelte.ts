import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

export class VpcEngine {
	household = $state<Record<string, unknown> | null>(null);
	playerStatuses = $state<Record<string, string>>({});
	loadErr = $state('');
	loadingHousehold = $state(true);

	wizardStage = $state<'select' | 'step1' | 'step2' | 'step3' | 'done'>('select');
	activePlayerEmail = $state('');

	disclosureScrolled = $state(false);
	disclosureEl = $state<HTMLElement | null>(null);

	consentWorkout = $state(false);
	consentIdentity = $state(false);
	consentAnalytics = $state(false);
	consentComms = $state(false);
	consentSponsor = $state(false);

	parentDisplayName = $state('');
	submitting = $state(false);
	submitError = $state('');

	get profile() { return authStore.userProfile; }
	get householdId() { return this.profile?.householdId ? String(this.profile.householdId) : ''; }

	get playerEmails() {
		const raw = this.household?.playerEmails;
		if (!Array.isArray(raw)) return [];
		return [...new Set(raw.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
	}

	get aggregateTrustStatus() {
		if (this.playerEmails.length === 0) return 'unknown';
		const statuses = this.playerEmails.map((em) => this.playerStatuses[em] ?? 'unknown');
		if (statuses.every((s) => s === 'verified' || s === 'not_required')) return 'verified';
		if (statuses.some((s) => s === 'pending' || s === 'pending_parent' || s === 'unknown')) return 'pending';
		return 'pending';
	}

	get firstPendingEmail() {
		return this.playerEmails.find((em) => !this.isPlayerVpcComplete(this.playerStatuses[em]));
	}

	async resolvePlayerVpcStatus(playerEmail: string) {
		const snap = await getDoc(doc(db, 'users', playerEmail));
		return snap.exists() ? snap.data()?.vpcStatus || 'unknown' : 'unknown';
	}

	async reloadPlayerStatus(playerEmail: string) {
		const status = await this.resolvePlayerVpcStatus(playerEmail);
		this.playerStatuses = { ...this.playerStatuses, [playerEmail]: status };
		return status;
	}

	isPlayerVpcComplete(status: string) {
		return status === 'verified' || status === 'not_required';
	}

	vpcStatusBadge(status: string) {
		switch (status) {
			case 'verified': return { label: 'Verified', cls: 'parent-vpc-status-chip--verified' };
			case 'not_required': return { label: 'Not required', cls: 'parent-vpc-status-chip--muted' };
			case 'pending':
			case 'pending_parent':
			default: return { label: 'Consent required', cls: 'parent-vpc-status-chip--pending' };
		}
	}

	startFirstPendingConsent() {
		const em = this.firstPendingEmail;
		if (em) this.startWizard(em);
	}

	startWizard(playerEmail: string) {
		this.activePlayerEmail = playerEmail;
		this.disclosureScrolled = false;
		this.consentWorkout = false;
		this.consentIdentity = false;
		this.consentAnalytics = false;
		this.consentComms = false;
		this.consentSponsor = false;
		this.parentDisplayName = this.profile?.playerName || '';
		this.submitError = '';
		this.wizardStage = 'step1';
	}

	cancelWizard() {
		this.wizardStage = 'select';
		this.activePlayerEmail = '';
		this.submitError = '';
	}

	onDisclosureScroll(event: Event) {
		const { scrollTop, scrollHeight, clientHeight } = event.target as HTMLElement;
		if (scrollHeight - scrollTop <= clientHeight + 10) {
			this.disclosureScrolled = true;
		}
	}

	async load() {
		if (!this.householdId || authStore.role !== 'parent') {
			this.household = null;
			this.loadingHousehold = false;
			return;
		}
		this.loadingHousehold = true;
		this.loadErr = '';

		try {
			const snap = await getDoc(doc(db, 'households', this.householdId));
			if (!snap.exists()) {
				this.loadErr = 'Household record not found. Ask your director to link your account.';
				this.household = null;
				this.loadingHousehold = false;
				return;
			}
			this.household = snap.data();
			if (this.playerEmails.length > 0) {
				const statusMap: Record<string, string> = {};
				const resolved = await Promise.all(this.playerEmails.map((em) => this.resolvePlayerVpcStatus(em)));
				for (let i = 0; i < this.playerEmails.length; i++) {
					statusMap[this.playerEmails[i]] = resolved[i];
				}
				this.playerStatuses = statusMap;
			}
		} catch (e: any) {
			this.loadErr = e.message;
		} finally {
			this.loadingHousehold = false;
		}
	}

	checkDisclosureHeight() {
		if (this.wizardStage !== 'step1' || !this.disclosureEl) return;
		requestAnimationFrame(() => {
			if (this.disclosureEl && this.disclosureEl.scrollHeight <= this.disclosureEl.clientHeight + 10) {
				this.disclosureScrolled = true;
			}
		});
	}

	async submitConsent() {
		if (!this.consentWorkout || !this.consentIdentity) {
			this.submitError = 'You must accept the required items (Workout Data and Identity) to proceed.';
			return;
		}
		if (!this.parentDisplayName.trim()) {
			this.submitError = 'Your legal name is required for the digital attestation.';
			return;
		}
		this.submitting = true;
		this.submitError = '';

		try {
			if (window.PublicKeyCredential) {
				const challenge = new Uint8Array(32);
				window.crypto.getRandomValues(challenge);
				const userId = new Uint8Array(16);
				window.crypto.getRandomValues(userId);

				await navigator.credentials.create({
					publicKey: {
						challenge,
						rp: { name: 'Vanguard Platform', id: window.location.hostname },
						user: { id: userId, name: this.profile?.email || 'parent@vanguard.com', displayName: this.parentDisplayName.trim() },
						pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
						authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
						timeout: 60000,
						attestation: 'direct'
					}
				});
			} else {
				console.warn('WebAuthn not supported on this device. Bypassing biometric enclave.');
			}

			const payload = {
				playerEmail: this.activePlayerEmail,
				parentDisplayName: this.parentDisplayName.trim(),
				consentItems: {
					workoutData: this.consentWorkout,
					identity: this.consentIdentity,
					analytics: this.consentAnalytics,
					comms: this.consentComms,
					sponsor: this.consentSponsor,
				},
				biometricVerified: !!window.PublicKeyCredential
			};
			const parentGrantVpcConsentFn = httpsCallable(functions, 'parentGrantVpcConsent');
			await parentGrantVpcConsentFn(payload);
			await this.reloadPlayerStatus(this.activePlayerEmail);
			this.wizardStage = 'done';
		} catch (e: any) {
			if (e instanceof DOMException) {
				if (e.name === 'NotAllowedError') this.submitError = 'Biometric attestation failed or was cancelled. Consent requires FaceID/TouchID verification.';
				else if (e.name === 'InvalidStateError') this.submitError = 'Device authenticator is already registered or in an invalid state.';
				else if (e.name === 'SecurityError') this.submitError = 'Security policy prevents biometric verification on this origin.';
				else this.submitError = `Biometric error: ${e.message}`;
			} else {
				this.submitError = e.message;
			}
		} finally {
			this.submitting = false;
		}
	}
}
