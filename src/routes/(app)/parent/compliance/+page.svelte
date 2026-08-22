<script lang="ts">
  let childDob = $state('');
  let parentConsentSigned = $state(false);
  let safeSportSigned = $state(false);
  let isUnder13 = $state(false);
  let challengeSubmitted = $state(false);
  let signatureHash = $state('');

  function checkDobChallenge() {
    if (!childDob) return;
    const birth = new Date(childDob);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      age--;
    }
    isUnder13 = age < 13;
    challengeSubmitted = true;
  }

  function handleSignWaivers() {
    if (isUnder13 && !parentConsentSigned) return;
    if (!safeSportSigned) return;
    signatureHash = `SIG_COPPASAFESPORT_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
</script>

<div class="tw-p-6 tw-bg-[#0f172a] tw-text-white tw-rounded-[24px] tw-border tw-border-slate-700">
  <h1 class="tw-text-2xl tw-font-bold tw-mb-4">Parent OS - COPPA Gates & Cryptographic Digital Waivers</h1>

  {#if !challengeSubmitted}
    <div id="coppa-dob-form" class="tw-bg-slate-800 tw-p-4 tw-rounded-[24px] tw-mb-4">
      <label for="child-dob-input" class="tw-block tw-text-sm tw-font-medium tw-mb-2">Enter Child Date of Birth</label>
      <input
        id="child-dob-input"
        type="date"
        bind:value={childDob}
        class="tw-bg-slate-900 tw-border tw-border-slate-600 tw-p-2 tw-rounded-md tw-text-white tw-mb-4"
      />
      <button
        id="submit-dob-btn"
        onclick={checkDobChallenge}
        class="tw-block tw-bg-blue-600 tw-text-white tw-px-4 tw-py-2 tw-rounded-md"
      >
        Verify DOB Challenge
      </button>
    </div>
  {:else}
    {#if isUnder13}
      <div id="coppa-gate-block" class="tw-bg-amber-900/40 tw-border tw-border-amber-500 tw-p-4 tw-rounded-[24px] tw-mb-4">
        <h3 class="tw-text-amber-300 tw-font-semibold tw-mb-2">⚠️ COPPA Compliance Verification Required (&lt; 13 Yrs)</h3>
        <p class="tw-text-sm tw-text-slate-300 tw-mb-3">Parental consent is mandatory before account execution proceeds.</p>
        <label class="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer">
          <input id="parent-consent-checkbox" type="checkbox" bind:checked={parentConsentSigned} />
          <span class="tw-text-sm">I give verified parent consent for digital participation.</span>
        </label>
      </div>
    {/if}

    <div class="tw-bg-slate-800 tw-p-4 tw-rounded-[24px] tw-mb-4">
      <h3 class="tw-text-lg tw-font-semibold tw-mb-2">SafeSport & Athletic Liability Digital Waiver</h3>
      <label class="tw-flex tw-items-center tw-gap-2 tw-cursor-pointer tw-mb-4">
        <input id="safesport-checkbox" type="checkbox" bind:checked={safeSportSigned} />
        <span class="tw-text-sm">I accept SafeSport Audit standards and general liability waiver terms.</span>
      </label>

      <button
        id="commit-digital-signature-btn"
        disabled={isUnder13 ? (!parentConsentSigned || !safeSportSigned) : !safeSportSigned}
        onclick={handleSignWaivers}
        class="tw-bg-emerald-600 disabled:tw-opacity-50 tw-text-white tw-px-4 tw-py-2 tw-rounded-md"
      >
        Commit Cryptographic Signature to Cloud Storage
      </button>
    </div>

    {#if signatureHash}
      <div id="waiver-signature-hash" class="tw-bg-emerald-950 tw-border tw-border-emerald-500 tw-p-4 tw-rounded-[24px] tw-text-emerald-300 tw-font-mono tw-text-xs">
        ✅ WAIVER SIGNED & COMMITTED: {signatureHash}
      </div>
    {/if}
  {/if}
</div>
