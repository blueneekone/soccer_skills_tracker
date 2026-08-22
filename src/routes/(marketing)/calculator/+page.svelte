<script lang="ts">
  let playerCount = $state(100);
  const teamSnapAnnualCost = 749;
  const sstPerPlayerCost = 12;

  let totalTeamSnapCost = $derived(playerCount * teamSnapAnnualCost);
  let totalSstCost = $derived(playerCount * sstPerPlayerCost);
  let annualSavings = $derived(totalTeamSnapCost - totalSstCost);
</script>

<div class="tw-min-h-screen tw-bg-[#000000] tw-text-white tw-p-8 tw-font-sans">
  <div class="tw-max-w-4xl tw-mx-auto tw-border tw-border-[#334155] tw-p-6">
    <h1 class="tw-font-mono tw-text-3xl tw-font-bold tw-text-amber-400 tw-mb-6 tw-uppercase">
      B2B COST SAVINGS CALCULATOR
    </h1>

    <div class="tw-mb-8">
      <label for="player-count-input" class="tw-block tw-font-mono tw-text-sm tw-text-slate-400 tw-mb-2">
        TOTAL CLUB PLAYERS: {playerCount}
      </label>
      <input
        id="player-count-input"
        type="range"
        min="10"
        max="1000"
        step="10"
        bind:value={playerCount}
        class="tw-w-full"
      />
    </div>

    <div id="pricing-comparison-table" class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-mb-8">
      <div class="tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-4">
        <div class="tw-font-mono tw-text-xs tw-text-slate-400">TRADITIONAL / TEAMSNAP</div>
        <div class="tw-font-mono tw-text-2xl tw-font-bold tw-text-red-400">${totalTeamSnapCost.toLocaleString()}</div>
        <div class="tw-text-xs tw-text-slate-500">${teamSnapAnnualCost}/player/yr</div>
      </div>

      <div class="tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-4">
        <div class="tw-font-mono tw-text-xs tw-text-slate-400">SSTRACKER ENTERPRISE</div>
        <div class="tw-font-mono tw-text-2xl tw-font-bold tw-text-emerald-400">${totalSstCost.toLocaleString()}</div>
        <div class="tw-text-xs tw-text-slate-500">${sstPerPlayerCost}/player/yr</div>
      </div>

      <div class="tw-bg-slate-900 tw-border tw-border-amber-500/50 tw-p-4">
        <div class="tw-font-mono tw-text-xs tw-text-amber-400">TOTAL ANNUAL SAVINGS</div>
        <div id="total-annual-savings" class="tw-font-mono tw-text-2xl tw-font-bold tw-text-amber-400">${annualSavings.toLocaleString()}</div>
        <div class="tw-text-xs tw-text-amber-300">Reinvested in Club Ops</div>
      </div>
    </div>

    <div class="tw-border tw-border-[#334155] tw-bg-[#000000] tw-p-4">
      <h3 class="tw-font-mono tw-text-sm tw-text-slate-400 tw-mb-3 tw-uppercase">SSTRACKER MASCOT DEMO LOOP</h3>
      <div id="video-mascot-container" class="tw-aspect-video tw-bg-slate-950 tw-border tw-border-[#334155] tw-flex tw-items-center tw-justify-center">
        <video
          id="mascot-play-loop"
          autoplay
          loop
          muted
          playsinline
          class="tw-w-full tw-h-full tw-object-cover"
        >
          <source src="/media/mascot-loop.webm" type="video/webm" />
        </video>
      </div>
    </div>
  </div>
</div>
