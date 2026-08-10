import { authStore } from '$lib/stores/auth.svelte.js';
import { db, functions } from '$lib/firebase.js';
import { httpsCallable } from 'firebase/functions';

export default class VpcEngine {
	loading = $state(false);
	error = $state('');
	success = $state(false);

	get isReady() {
		return !!db && authStore.isAuthenticated;
	}

	async register() {
		if (!this.isReady) return;
		this.loading = true;
		this.error = '';

		try {
			const generateVpcChallenge = httpsCallable(functions, 'generateVpcChallenge');
			const { data } = await generateVpcChallenge();
			const challenge = (data as { challenge: string }).challenge;

			const publicKey: PublicKeyCredentialCreationOptions = {
				challenge: Uint8Array.from(atob(challenge.replace(/-/g, '+').replace(/_/g, '/')), (c: string) => c.charCodeAt(0)),
				rp: { name: 'Vanguard VPC', id: window.location.hostname },
				user: {
					id: Uint8Array.from(authStore.user?.uid || 'user', (c: string) => c.charCodeAt(0)),
					name: authStore.user?.email || 'parent',
					displayName: 'Parent Guardian'
				},
				pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
				authenticatorSelection: { userVerification: 'required' },
				timeout: 60000,
				attestation: 'direct'
			};

			const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
			if (!credential) throw new Error('Biometric registration failed or was cancelled.');

			const credentialPayload = {
				id: credential.id,
				rawId: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(credential.rawId)))),
				type: credential.type,
				response: {
					attestationObject: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).attestationObject)))),
					clientDataJSON: btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array((credential.response as AuthenticatorAttestationResponse).clientDataJSON))))
				}
			};

			const verifyVpcSignature = httpsCallable(functions, 'verifyVpcSignature');
			await verifyVpcSignature({ credentialPayload });

			this.success = true;
		} catch (err) {
			console.error(err);
			this.error = err instanceof Error ? err.message : 'Unknown error during VPC registration';
		} finally {
			this.loading = false;
		}
	}
}
