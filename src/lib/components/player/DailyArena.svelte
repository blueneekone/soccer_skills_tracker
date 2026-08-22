<script lang="ts">
  import { checkTrainingHourCaps } from '$lib/services/player/hourCaps';

  let {
    playerDob = '2012-05-15',
    onLogSession = (session: { type: string; touches: number; hours: number }) => {}
  } = $props();

  let sessionType = $state('backyard_juggle');
  let touchCount = $state(150);
  let durationHours = $state(1.5);

  let weeklySessions = $state<{ type: string; touches: number; hours: number }[]>([
    { type: 'team_practice', touches: 300, hours: 4 },
    { type: 'deliberate_play', touches: 200, hours: 5 },
    { type: 'deliberate_play', touches: 250, hours: 4 }
  ]);

  let capStatus = $derived(checkTrainingHourCaps(weeklySessions, playerDob));

  function handleLogTouchSession() {
    const newSession = {
      type: sessionType,
      touches: Number(touchCount),
      hours: Number(durationHours)
    };
    weeklySessions = [...weeklySessions, newSession];
    onLogSession(newSession);
  }
</script>

<div class="tw-bg-[#000000] tw-border tw-border-[#334155] tw-p-6 tw-text-white tw-clip-polygon" style="clip-path: polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px);">
  <div class="tw-flex tw-justify-between tw-items-center tw-mb-4">
    <h2 class="tw-font-mono tw-text-xl tw-uppercase tw-tracking-wider tw-text-[#fbbf24]">
      DAILY ARENA - DELIBERATE PLAY TRACKER
    </h2>
    <span class="tw-font-mono tw-text-xs tw-text-slate-400">AGE: {capStatus.ageYears} YRS</span>
  </div>

  {#if capStatus.exceedsCap}
    <div id="hour-cap-warning" class="tw-bg-red-900/40 tw-border tw-border-red-500 tw-p-3 tw-mb-4 tw-text-red-300 tw-font-mono tw-text-xs">
      ⚠️ {capStatus.warningMessage}
    </div>
  {/if}

  <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4 tw-mb-4">
    <div>
      <label for="daily-arena-session-type" class="tw-block tw-font-mono tw-text-xs tw-text-slate-400 tw-mb-1">SESSION TYPE</label>
      <select
        id="daily-arena-session-type"
        bind:value={sessionType}
        class="tw-w-full tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-2 tw-font-mono tw-text-sm tw-text-white"
      >
        <option value="backyard_juggle">BACKYARD JUGGLING</option>
        <option value="wall_rebound">WALL REBOUNDER</option>
        <option value="street_panna">STREET PANNA / PICKUP</option>
      </select>
    </div>

    <div>
      <label for="daily-arena-touches" class="tw-block tw-font-mono tw-text-xs tw-text-slate-400 tw-mb-1">TOUCHES</label>
      <input
        id="daily-arena-touches"
        type="number"
        bind:value={touchCount}
        class="tw-w-full tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-2 tw-font-mono tw-text-sm tw-text-white"
      />
    </div>

    <div>
      <label for="daily-arena-duration" class="tw-block tw-font-mono tw-text-xs tw-text-slate-400 tw-mb-1">DURATION (HRS)</label>
      <input
        id="daily-arena-duration"
        type="number"
        step="0.5"
        bind:value={durationHours}
        class="tw-w-full tw-bg-slate-900 tw-border tw-border-[#334155] tw-p-2 tw-font-mono tw-text-sm tw-text-white"
      />
    </div>
  </div>

  <button
    id="log-deliberate-play-btn"
    onclick={handleLogTouchSession}
    class="tw-w-full tw-bg-[#fbbf24] tw-text-black tw-font-mono tw-font-bold tw-py-2 tw-uppercase hover:tw-bg-amber-400 tw-transition-colors"
  >
    LOG BACKYARD TOUCHES
  </button>

  <div class="tw-mt-6">
    <div class="tw-flex tw-justify-between tw-font-mono tw-text-xs tw-text-slate-400 tw-mb-2">
      <span>WEEKLY VOLUME: {capStatus.totalWeeklyHours} HRS</span>
      <span>RECOMMENDED MAX: {capStatus.ageYears} HRS</span>
    </div>
    <div class="tw-w-full tw-bg-slate-800 tw-h-2">
      <div
        class="tw-h-2 {capStatus.exceedsCap ? 'tw-bg-red-500' : 'tw-bg-emerald-400'}"
        style="width: {Math.min(100, (capStatus.totalWeeklyHours / (capStatus.ageYears || 1)) * 100)}%"
      ></div>
    </div>
  </div>
</div>
