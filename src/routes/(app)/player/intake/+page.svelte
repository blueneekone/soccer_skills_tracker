<script lang="ts">
	import { MedicalIntakeEngine } from '$lib/compliance/MedicalIntakeEngine.svelte';
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores/auth.svelte.js';

	const engine = new MedicalIntakeEngine();
	const todayDate = new Date().toISOString().split('T')[0];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		await engine.submit();
		if (authStore.userProfile?.medicalSignatureVerified) {
			goto()
		}
	}
</script>

<div class="medical-intake-container tw-max-w-md tw-mx-auto tw-p-6 tw-bg-black tw-border tw-border-[#1e293b] tw-text-white tw-mt-10">
	<h1 class="tw-text-xl tw-font-bold tw-mb-4 tw-text-[#14b8a6]">HIPAA Compliance Intake & Medical Release</h1>
	<p class="tw-text-sm tw-text-gray-400 tw-mb-6">Please complete this integrated medical intake gate before continuing to player performance data.</p>

	<form onsubmit={handleSubmit} class="tw-space-y-4">
		<div>
			<label class="tw-block tw-text-sm tw-font-semibold tw-mb-1" for="emergency-contact">
				Emergency Contact Name <span class="tw-text-red-500">*</span>
			</label>
			<input
				type="text"
				id="emergency-contact"
				bind:value={engine.emergencyContactName}
				placeholder="John Doe"
				class="tw-w-full tw-p-2 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded tw-text-white focus:tw-outline-none focus:tw-border-[#14b8a6]"
				required
			/>
		</div>

		<div class="tw-flex tw-items-center tw-space-x-2">
			<input
				type="checkbox"
				id="toggle-sensitive"
				checked={engine.showSensitiveFields}
				onchange={() => engine.toggleSensitiveFields()}
				class="tw-rounded tw-bg-[#0f172a] tw-border-[#1e293b] tw-text-[#14b8a6]"
			/>
			<label for="toggle-sensitive" class="tw-text-sm tw-text-gray-300 tw-cursor-pointer">
				Provide primary health insurance details (Optional)
			</label>
		</div>

		{#if engine.showSensitiveFields}
			<div class="tw-space-y-4 tw-p-3 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded">
				<div>
					<label class="tw-block tw-text-sm tw-font-semibold tw-mb-1" for="insurance-carrier">
						Primary Health Insurance Carrier
					</label>
					<input
						type="text"
						id="insurance-carrier"
						bind:value={engine.insuranceCarrier}
						placeholder="Blue Cross"
						class="tw-w-full tw-p-2 tw-bg-black tw-border tw-border-[#1e293b] tw-rounded tw-text-white focus:tw-outline-none focus:tw-border-[#14b8a6]"
					/>
				</div>

				<div>
					<label class="tw-block tw-text-sm tw-font-semibold tw-mb-1" for="policy-id">
						Policy ID (Numerical)
					</label>
					<input
						type="text"
						id="policy-id"
						bind:value={engine.policyId}
						placeholder="123456789"
						class="tw-w-full tw-p-2 tw-bg-black tw-border tw-border-[#1e293b] tw-rounded tw-text-white tw-font-mono focus:tw-outline-none focus:tw-border-[#14b8a6]"
					/>
				</div>
			</div>
		{/if}

		<div class="tw-p-4 tw-bg-[#0f172a]/50 tw-border tw-border-[#1e293b] tw-rounded tw-text-xs tw-text-gray-400 tw-space-y-2">
			<p class="tw-font-bold tw-text-gray-200">HIPAA Authorization & Release Statement</p>
			<p>I hereby authorize the release of medical/performance data to the coaching staff and authorized administrators for physical tracking and emergency preparedness.</p>
			<div class="tw-flex tw-justify-between tw-pt-2 tw-border-t tw-border-[#1e293b]">
				<span>Signature Date:</span>
				<span class="tw-font-mono tw-text-[#14b8a6]">{todayDate}</span>
			</div>
		</div>

		<div>
			<label class="tw-block tw-text-sm tw-font-semibold tw-mb-1" for="signature">
				Electronic Signature (Full Legal Name) <span class="tw-text-red-500">*</span>
			</label>
			<input
				type="text"
				id="signature"
				bind:value={engine.signature}
				placeholder="Jane Doe"
				class="tw-w-full tw-p-2 tw-bg-[#0f172a] tw-border tw-border-[#1e293b] tw-rounded tw-text-white focus:tw-outline-none focus:tw-border-[#14b8a6]"
				required
			/>
		</div>

		{#if engine.error}
			<p class="tw-text-red-500 tw-text-xs tw-font-semibold">{engine.error}</p>
		{/if}

		<button
			type="submit"
			disabled={!engine.isValid || engine.isSubmitting}
			class="tw-w-full tw-p-3 tw-bg-[#14b8a6] hover:tw-bg-[#0d9488] disabled:tw-bg-gray-700 disabled:tw-cursor-not-allowed tw-text-black tw-font-bold tw-rounded tw-transition"
		>
			{engine.isSubmitting ? 'SUBMITTING...' : 'AUTHORIZE & AGREE'}
		</button>
	</form>
</div>
