<script lang="ts">
  import { createAvatar } from '@dicebear/core';
  import * as shapes from '@dicebear/shapes';

  let {
    seed = 'default',
    size = 40,
    class: klass = '',
  }: {
    seed?: string;
    size?: number;
    class?: string;
  } = $props();

  const svgString = $derived.by(() => {
    const avatar = createAvatar(shapes, {
      seed,
      size: 128,
      backgroundColor: ['1e293b', '1a2234', '0f172a', '162032'],
      shape1Color: ['14b8a6', '2dd4bf', '0d9488', '0891b2', '38bdf8'],
      shape2Color: ['1e3a5f', '1e293b', '0f2130', '0e2436'],
      shape3Color: ['0f172a', '0b1120', '111827'],
    });
    return avatar.toString();
  });
</script>

<div
  class="tw-shrink-0 tw-overflow-hidden tw-rounded-full tw-border tw-border-slate-700 {klass}"
  style="width: {size}px; height: {size}px; min-width: {size}px;"
  aria-hidden="true"
>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html svgString}
</div>
