<script lang="ts">
  import { httpsCallable } from 'firebase/functions';
  import { getFunctions } from 'firebase/functions';
  import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
  import Papa from 'papaparse';
  import Download from 'lucide-svelte/icons/download';
  import FileJson from 'lucide-svelte/icons/file-json';
  import FileText from 'lucide-svelte/icons/file-text';
  import VampireImporter from '$lib/components/interoperability/VampireImporter.svelte';
  import AffinitySyncCard from '$lib/components/interoperability/AffinitySyncCard.svelte';

  const clubId = $derived(licenseEntitlementStore.clubIdResolved);

  let isExporting = $state(false);

  async function handleExport(format: 'csv' | 'json') {
    if (isExporting) return;
    isExporting = true;
    try {
      const fns = getFunctions(undefined, 'us-east1');
      const extractTenantData = httpsCallable(fns, 'extractTenantData');
      
      const res = await extractTenantData({
        clubId,
        collectionType: 'users',
        format
      });

      const data = res.data as { data: string | object[] };
      let blob;
      if (format === 'csv') {
        blob = new Blob([data.data as string], { type: 'text/csv' });
      } else {
        blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `export_users_${clubId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('Export failed.');
    } finally {
      isExporting = false;
    }
  }

  async function handlePrintPDF() {
    if (isExporting) return;
    isExporting = true;
    try {
      const fns = getFunctions(undefined, 'us-east1');
      const extractTenantData = httpsCallable(fns, 'extractTenantData');
      
      const res = await extractTenantData({
        clubId,
        collectionType: 'users',
        format: 'json'
      });

       
      const data = res.data as { data: any[] };
      
      // Hidden printable iframe technique
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        let html = `
          <html><head><title>Export</title>
          <style>
            body { font-family: monospace; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          </style>
          </head><body>
          <h2>Tenant Data Export</h2>
          <table>
            <thead>
              <tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Role</th></tr>
            </thead>
            <tbody>
        `;
        for (const row of data.data) {
          html += `<tr><td>${row.firstName}</td><td>${row.lastName}</td><td>${row.email}</td><td>${row.role}</td></tr>`;
        }
        html += `</tbody></table></body></html>`;
        
        doc.open();
        doc.write(html);
        doc.close();

        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 1000);
    } catch (e) {
      console.error('PDF Export failed:', e);
      alert('PDF Export failed.');
    } finally {
      isExporting = false;
    }
  }
</script>

<div
  class="pd-page-root tw-flex tw-flex-col tw-w-full tw-min-w-0 tw-flex-1 tw-min-h-0 tw-gap-[clamp(24px,3vw,36px)] tw-bg-[#0B0F19] tw-text-[#FAFAFA] dark-form-surface cc-root tw-box-border tw-overflow-y-auto"
  style="padding: var(--bento-pad-liquid, clamp(20px, 4vw, 32px)); box-sizing: border-box;"
  data-admin-shell="true"
>
  <header class="tw-border-b tw-border-[#334155] tw-pb-4">
    <h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-m-0">Interoperability Hub</h1>
    <p class="tw-text-sm tw-text-[#94A3B8] tw-font-mono tw-mt-1">Multi-tenant data liquidity, ingestion pipelines, and third-party roster sync.</p>
  </header>

  <!-- Phase 1: Outbound Exports -->
  <section class="tw-flex tw-flex-col tw-gap-3">
    <h2 class="tw-text-sm tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-widest tw-font-mono tw-m-0">Total Data Liquidity (Outbound)</h2>
    <div class="tw-flex tw-flex-wrap tw-gap-3">
      <button 
        type="button"
        class="v-toolbar-btn tw-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-none hover:tw-bg-[#1e293b] hover:tw-border-[#14b8a6] tw-text-[#FAFAFA] hover:tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
        onclick={() => handleExport('csv')}
        disabled={isExporting}
      >
        <Download strokeWidth={1.5} class="tw-w-4 tw-h-4 tw-text-[#14b8a6]" />
        <span>Export CSV</span>
      </button>

      <button 
        type="button"
        class="v-toolbar-btn tw-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-none hover:tw-bg-[#1e293b] hover:tw-border-[#14b8a6] tw-text-[#FAFAFA] hover:tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
        onclick={() => handleExport('json')}
        disabled={isExporting}
      >
        <FileJson strokeWidth={1.5} class="tw-w-4 tw-h-4 tw-text-[#14b8a6]" />
        <span>Export JSON</span>
      </button>

      <button 
        type="button"
        class="v-toolbar-btn tw-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-none hover:tw-bg-[#1e293b] hover:tw-border-[#14b8a6] tw-text-[#FAFAFA] hover:tw-text-[#14b8a6] tw-font-mono tw-text-xs tw-font-bold tw-uppercase tw-tracking-wider tw-transition-colors disabled:tw-opacity-50 disabled:tw-cursor-not-allowed"
        onclick={handlePrintPDF}
        disabled={isExporting}
      >
        <FileText strokeWidth={1.5} class="tw-w-4 tw-h-4 tw-text-[#14b8a6]" />
        <span>Export PDF</span>
      </button>
    </div>
  </section>

  <!-- Phase 2 & 3: Vampire Engine & Affinity Sync -->
  <section class="tw-flex tw-flex-col tw-gap-4">
    <h2 class="tw-text-sm tw-font-bold tw-text-[#FAFAFA] tw-uppercase tw-tracking-widest tw-font-mono tw-m-0">Vampire Engine (Inbound)</h2>
    <VampireImporter {clubId} />
    <AffinitySyncCard {clubId} />
  </section>
</div>
