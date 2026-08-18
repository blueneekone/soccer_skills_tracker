<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    cards: Array<{ id: string | number; content: Snippet }>;
  }

  let { cards }: Props = $props();
</script>

<div
  class="tw-p-6 tw-grid tw-gap-[clamp(12px,2vw,24px)]"
  style="padding: clamp(16px, 3vw, 24px); grid-template-columns: repeat(auto-fit, minmax(min(100%, clamp(280px, 30vw, 350px)), 1fr));"
>
  {#each cards as card (card.id)}
    <div class="tw-min-w-0">
      {@render card.content()}
    </div>
  {/each}
</div>
