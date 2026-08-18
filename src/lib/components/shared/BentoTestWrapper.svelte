<script lang="ts" module>
  // Expose a basic wrap for test
  export const testSnippetContent = 'Test snippet';
</script>

<script lang="ts">
  import BentoContainer from './BentoContainer.svelte';
</script>

{#snippet contentSnippet()}
  <div data-testid="bento-content">{testSnippetContent}</div>
{/snippet}

<BentoContainer cards={[{ id: 1, content: contentSnippet }]} />
