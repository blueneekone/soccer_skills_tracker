<script lang="ts">
  let userRole = $state('recruiter');
  let searchKeyword = $state('');

  const sampleAthletes = [
    { id: 'ath1', name: 'Alex Johnson', position: 'Midfielder', age: 16, email: 'alex@parent.com', hasWaiver: true },
    { id: 'ath2', name: 'Jordan Smith', position: 'Forward', age: 15, email: 'jordan@parent.com', hasWaiver: false }
  ];

  let filteredAthletes = $derived(
    sampleAthletes.map((a) => {
      // Strip PII unless explicit parental waiver is verified
      const email = a.hasWaiver ? a.email : '[PROTECTED_MINOR_PII]';
      return { ...a, email };
    })
  );
</script>

<div class="tw-min-h-screen tw-bg-[#000000] tw-text-white tw-p-6">
  <div class="tw-border tw-border-[#334155] tw-p-6">
    <h1 class="tw-font-mono tw-text-xl tw-text-[#fbbf24] tw-uppercase tw-mb-4">
      RECRUITER VETTING & TALENT SCOUT HUD
    </h1>

    {#if userRole !== 'recruiter'}
      <div id="recruiter-access-blocked" class="tw-bg-red-950 tw-border tw-border-red-500 tw-p-4 tw-text-red-300 tw-font-mono tw-text-sm">
        ⛔ ACCESS DENIED: RECRUITER CUSTOM CLAIM REQUIRED
      </div>
    {:else}
      <div id="recruiter-[#334155]" class="tw-space-y-4">
        <input
          type="text"
          bind:value={searchKeyword}
          placeholder="Search prospects..."
          class="tw-w-full tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-2 tw-font-mono tw-text-sm tw-text-white"
        />

        <div id="recruiter-prospects-list" class="tw-space-y-2">
          {#each filteredAthletes as prospect}
            <div class="tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-4 tw-flex tw-justify-between tw-items-center">
              <div>
                <div class="tw-font-mono tw-text-base tw-font-bold tw-text-white">{prospect.name}</div>
                <div class="tw-font-mono tw-text-xs tw-text-slate-400">{prospect.position} | AGE {prospect.age}</div>
              </div>
              <div class="tw-font-mono tw-text-xs tw-text-amber-400">
                CONTACT: {prospect.email}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>
