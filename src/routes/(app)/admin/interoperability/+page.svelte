<script lang="ts">
  import { httpsCallable } from 'firebase/functions';
  import { getFunctions } from 'firebase/functions';
  import { licenseEntitlementStore } from '$lib/stores/licenseEntitlement.svelte.js';
  import Papa from 'papaparse';
  import { Download, FileJson, FileText } from 'lucide-svelte';
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

<div class="tw-p-8 tw-max-w-7xl tw-mx-auto tw-text-[#D4D4D8]">
  <h1 class="tw-text-2xl tw-font-bold tw-text-[#FAFAFA] tw-mb-8">Interoperability Hub</h1>

  <!-- Phase 1: Outbound Exports -->
  <section class="tw-mb-12">
    <h2 class="tw-text-lg tw-font-bold tw-text-[#FAFAFA] tw-mb-4">Total Data Liquidity (Outbound)</h2>
    <div class="tw-flex tw-gap-4">
      <button 
        class="tw-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-md tw-hover:bg-[#1e293b] tw-transition-colors disabled:opacity-50"
        onclick={() => handleExport('csv')}
        disabled={isExporting}
      >
        <Download strokeWidth={1.5} class="tw-w-5 tw-h-5" />
        <span>Export CSV</span>
      </button>

      <button 
        class="tw-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-md tw-hover:bg-[#1e293b] tw-transition-colors disabled:opacity-50"
        onclick={() => handleExport('json')}
        disabled={isExporting}
      >
        <FileJson strokeWidth={1.5} class="tw-w-5 tw-h-5" />
        <span>Export JSON</span>
      </button>

      <button 
        class="tw-flex tw-items-center tw-gap-2 tw-bg-[#0f172a] tw-border tw-border-[#334155] tw-px-4 tw-py-2 tw-rounded-md tw-hover:bg-[#1e293b] tw-transition-colors disabled:opacity-50"
        onclick={handlePrintPDF}
        disabled={isExporting}
      >
        <FileText strokeWidth={1.5} class="tw-w-5 tw-h-5" />
        <span>Export PDF</span>
      </button>
    </div>
  </section>

  <!-- Phase 2 & 3: Vampire Engine & Affinity Sync -->
  <section>
    <h2 class="tw-text-lg tw-font-bold tw-text-[#FAFAFA] tw-mb-4">Vampire Engine (Inbound)</h2>
    <VampireImporter {clubId} />
    <AffinitySyncCard {clubId} />
  </section>
</div>
