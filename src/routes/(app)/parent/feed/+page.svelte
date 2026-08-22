<script lang="ts">
  let cardMetrics = $state([
    { title: 'Self-Worth Score', rating: 'Exceptional (High Autonomy)' },
    { title: 'Caring Climate Score', rating: '95% Positive Team Dynamic' },
    { title: 'Mastery Climate', rating: 'Focused on Personal Growth' }
  ]);
</script>

<div class="tw-p-6 tw-[#0f172a] tw-text-white tw-rounded-[24px] tw-border tw-border-slate-700">
  <h1 class="tw-text-2xl tw-font-bold tw-mb-4">Parent OS - Emotional Safety Enjoyment Feed</h1>
  <p class="tw-text-slate-400 tw-text-sm tw-mb-6">
    Qualitative metrics focused exclusively on emotional safety, team climate, and athlete well-being.
  </p>

  <div class="tw-grid tw-grid-cols-1 md:tw-grid-cols-3 tw-gap-4">
    {#each cardMetrics as metric}
      <div class="tw-bg-slate-800 tw-p-4 tw-rounded-[24px] tw-border tw-border-slate-600">
        <h3 class="tw-text-emerald-400 tw-font-semibold tw-text-lg tw-mb-2">{metric.title}</h3>
        <p class="tw-text-slate-200 tw-font-medium">{metric.rating}</p>
      </div>
    {/each}
  </div>
</div>
