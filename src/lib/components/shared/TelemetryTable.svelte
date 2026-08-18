<script lang="ts">
  interface TelemetryRow {
    id: string;
    description: string;
    value: number | string;
    timestamp: string;
  }

  interface Props {
    data: TelemetryRow[];
  }

  let { data }: Props = $props();
</script>

<div class="tw-w-full tw-overflow-x-auto">
  <table class="tw-w-full tw-bg-[#0f172a] tw-border-collapse tw-border tw-border-[#334155]">
    <thead>
      <tr class="tw-border-b tw-border-[#334155]">
        <th class="tw-text-left tw-p-4 tw-font-sans tw-text-[#FAFAFA]">ID</th>
        <th class="tw-text-left tw-p-4 tw-font-sans tw-text-[#FAFAFA]">Description</th>
        <th class="tw-text-left tw-p-4 tw-font-sans tw-text-[#FAFAFA]">Value</th>
        <th class="tw-text-left tw-p-4 tw-font-sans tw-text-[#FAFAFA]">Timestamp</th>
      </tr>
    </thead>
    <tbody>
      {#each data as row (row.id)}
        <tr class="tw-border-b tw-border-[#334155]">
          <td class="tw-p-4 tw-font-mono tw-text-[#D4D4D8]">{row.id}</td>
          <td class="tw-p-4 tw-font-sans tw-text-[#D4D4D8]">{row.description}</td>
          <td class="tw-p-4 tw-font-mono tw-text-[#D4D4D8]">{row.value}</td>
          <td class="tw-p-4 tw-font-mono tw-text-[#D4D4D8]">{row.timestamp}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
