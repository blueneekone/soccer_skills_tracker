<script lang="ts">
  import { httpsCallable } from 'firebase/functions';
  import { functions } from '$lib/firebase.js';
  import Papa from 'papaparse';
  import { UploadCloud, CheckCircle } from 'lucide-svelte';

  const { clubId } = $props<{ clubId: string }>();

  // Drag and Drop State
  let isDragging = $state(false);
  let csvHeaders = $state<string[]>([]);
   
  let csvData = $state<any[]>([]);
   
  let previewData = $state<any[]>([]);

  // Mapping State
  let mappingState = $state({
    firstName: '',
    lastName: '',
    email: '',
    role: ''
  });
  let isIngesting = $state(false);
  let ingestResult = $state<{ ingested: number } | null>(null);

  // Target schema fields
  const schemaFields = [
    { key: 'firstName', label: 'First Name', required: true },
    { key: 'lastName', label: 'Last Name', required: true },
    { key: 'email', label: 'Email Address', required: false },
    { key: 'role', label: 'Role (Optional)', required: false }
  ];

  function handleFileSelect(e: DragEvent | Event) {
    let file: File | null = null;
    if (e.type === 'drop') {
      const dragEvent = e as DragEvent;
      file = dragEvent.dataTransfer?.files?.[0] || null;
    } else {
      const inputEvent = e as Event;
      const target = inputEvent.target as HTMLInputElement;
      file = target.files?.[0] || null;
    }

    if (file && file.name.endsWith('.csv')) {
      parseCSV(file);
    } else if (file) {
      alert('Please upload a valid CSV file.');
    }
  }

  function parseCSV(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        csvHeaders = results.meta.fields || [];
        csvData = results.data;
        previewData = results.data.slice(0, 5);
      },
      error: (error: Error) => {
        console.error('CSV parse error:', error);
        alert('Failed to parse CSV.');
      }
    });
  }

  async function executeIngestion() {
    if (isIngesting) return;
    
    // Validate mapping
    if (!mappingState.firstName || !mappingState.lastName) {
      alert('First Name and Last Name must be mapped.');
      return;
    }

    isIngesting = true;
    try {
      const mappedRows = csvData.map(row => {
        return {
          firstName: row[mappingState.firstName],
          lastName: row[mappingState.lastName],
          email: mappingState.email ? row[mappingState.email] : '',
          role: mappingState.role ? row[mappingState.role] : ''
        };
      });

      const fns = functions;
      const vampireIngestRows = httpsCallable(fns, 'vampireIngestRows');
      
      const res = await vampireIngestRows({
        clubId,
        rows: mappedRows
      });

      const data = res.data as { ingested: number };
      ingestResult = data;
      csvData = [];
      previewData = [];
    } catch (e) {
      console.error('Ingestion failed:', e);
      alert('Ingestion failed.');
    } finally {
      isIngesting = false;
    }
  }
</script>

<div class="tw-w-full">
  {#if ingestResult}
    <div class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-p-6 tw-rounded-lg tw-flex tw-items-center tw-gap-4 tw-mb-8">
      <CheckCircle strokeWidth={1.5} class="tw-w-8 tw-h-8 tw-text-green-500" />
      <div>
        <h3 class="tw-text-[#FAFAFA] tw-font-bold">Ingestion Complete</h3>
        <p class="tw-text-[#A1A1AA]">Successfully ingested {ingestResult.ingested} records.</p>
      </div>
      <button 
        class="tw-ml-auto tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-md tw-text-[#FAFAFA]"
        onclick={() => { ingestResult = null; csvHeaders = []; }}
      >
        New Import
      </button>
    </div>
  {/if}

  {#if csvHeaders.length === 0 && !ingestResult}
    <!-- Drag and Drop Zone -->
    <div 
      role="region"
      aria-label="File Upload Dropzone"
      class="tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-12 tw-flex tw-flex-col tw-items-center tw-justify-center tw-transition-colors {isDragging ? 'tw-border-[#FAFAFA]' : ''}"
      ondragover={(e) => { e.preventDefault(); isDragging = true; }}
      ondragleave={(e) => { e.preventDefault(); isDragging = false; }}
      ondrop={(e) => { e.preventDefault(); isDragging = false; handleFileSelect(e); }}
    >
      <UploadCloud strokeWidth={1.5} class="tw-w-12 tw-h-12 tw-mb-4 tw-text-[#A1A1AA]" />
      <p class="tw-text-[#D4D4D8] tw-mb-4 tw-font-mono">Drag and drop a CSV file here, or click to browse.</p>
      <label class="tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-px-6 tw-py-2 tw-rounded-md tw-cursor-pointer tw-hover:bg-[#334155] tw-transition-colors tw-text-[#FAFAFA] tw-font-mono tw-font-bold">
        <span>SELECT FILE</span>
        <input type="file" accept=".csv" class="tw-hidden" onchange={handleFileSelect} />
      </label>
    </div>
  {:else if csvHeaders.length > 0 && !ingestResult}
    <!-- Visual Column Mapper (Bento Grid 12-column) -->
    <div class="tw-grid tw-grid-cols-12 tw-gap-6 tw-items-start">
      <!-- Mapping Controls -->
      <div class="tw-col-span-12 lg:tw-col-span-4 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6">
        <h3 class="tw-text-[#FAFAFA] tw-font-bold tw-mb-6">Map Columns</h3>
        
        <div class="tw-space-y-6">
          {#each schemaFields as field}
            <div>
              <label class="tw-block tw-text-sm tw-font-bold tw-text-[#D4D4D8] tw-mb-2">
                {field.label} {#if field.required}<span class="tw-text-red-500">*</span>{/if}
                <select 
                  class="tw-w-full tw-bg-[#1e293b] tw-border tw-border-[#334155] tw-text-[#FAFAFA] tw-rounded-md tw-px-3 tw-py-2 tw-mt-2"
                  bind:value={mappingState[field.key as keyof typeof mappingState]}
                >
                  <option value="">-- Select Column --</option>
                  {#each csvHeaders as header}
                    <option value={header}>{header}</option>
                  {/each}
                </select>
              </label>
            </div>
          {/each}
        </div>

        <button 
          class="tw-w-full tw-mt-8 tw-bg-[#FAFAFA] tw-text-[#0f172a] tw-font-bold tw-py-3 tw-rounded-md tw-hover:bg-[#D4D4D8] tw-transition-colors disabled:opacity-50"
          onclick={executeIngestion}
          disabled={isIngesting || !mappingState.firstName || !mappingState.lastName}
        >
          {isIngesting ? 'Ingesting...' : 'Execute Ingestion'}
        </button>
      </div>

      <!-- Preview Matrix -->
      <div class="tw-col-span-12 lg:tw-col-span-8 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-rounded-xl tw-p-6 tw-overflow-x-auto">
        <h3 class="tw-text-[#FAFAFA] tw-font-bold tw-mb-6">Data Preview (5 Rows)</h3>
        
        <table class="tw-w-full tw-text-left tw-text-sm">
          <thead>
            <tr class="tw-border-b tw-border-[#334155]">
              {#each schemaFields as field}
                <th class="tw-py-3 tw-pr-4 tw-text-[#A1A1AA] tw-font-bold">{field.label}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each previewData as row}
              <tr class="tw-border-b tw-border-[#334155] tw-last:border-0">
                {#each schemaFields as field}
                  <td class="tw-py-3 tw-pr-4 tw-text-[#D4D4D8]">
                    {mappingState[field.key as keyof typeof mappingState] ? row[mappingState[field.key as keyof typeof mappingState]] || '-' : '-'}
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>
