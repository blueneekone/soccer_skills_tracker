// 🛡️ SafeSport Compliance Mandate: Enforces Parent Shadow CC routing for minors.
import { authStore } from '$lib/stores/auth.svelte.js';

export class MedicalIntakeEngine {
	emergencyContactName = $state('');
	insuranceCarrier = $state('');
	policyId = $state('');
	signature = $state('');
	showSensitiveFields = $state(false);
	isSubmitting = $state(false);
	error = $state('');

	get isValid() {
		const hasContact = this.emergencyContactName.trim().length > 0;
		const hasSignature = this.signature.trim().length > 0;
		if (!hasContact || !hasSignature) return false;
		if (this.showSensitiveFields) {
			const hasCarrier = this.insuranceCarrier.trim().length > 0;
			const hasPolicy = this.policyId.trim().length > 0;
			return hasCarrier && hasPolicy;
		}
		return true;
	}

	toggleSensitiveFields() {
		this.showSensitiveFields = !this.showSensitiveFields;
	}

	async submit() {
		if (!this.isValid) {
			this.error = 'Please fill out all required fields.';
			return;
		}
		this.isSubmitting = true;
		this.error = '';
		try {
			// Save using a secure Cloud Function
			// (Client-side reads and writes to 'medical_records' are strictly forbidden)
			const { functions } = await import('$lib/firebase.js');
			const { httpsCallable } = await import('firebase/functions');
			const saveIntake = httpsCallable(functions, 'submitMedicalIntake');
			await saveIntake({
				emergencyContactName: this.emergencyContactName,
				insuranceCarrier: this.showSensitiveFields ? this.insuranceCarrier : '',
				policyId: this.showSensitiveFields ? this.policyId : '',
				signature: this.signature,
			});
			if (authStore.userProfile) {
				authStore.userProfile.medicalSignatureVerified = true;
			}
		} catch (err: any) {
			this.error = err?.message || 'Submission failed.';
		} finally {
			this.isSubmitting = false;
		}
	}
}
