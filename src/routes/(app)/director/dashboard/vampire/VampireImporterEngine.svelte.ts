import { getActiveDb, functions } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { httpsCallable } from 'firebase/functions';
import Papa from 'papaparse';
import { parseAndSanitizeCSV, type VampireRow } from '$lib/utils/vampireSanitizer.js';

export class VampireImporterEngine {
  file = $state<File | null>(null);
  isParsing = $state<boolean>(false);
  isUploading = $state<boolean>(false);
  parsedRows = $state<VampireRow[]>([]);
  totalRowCount = $state<number>(0);
  ingestedCount = $state<number>(0);
  errorMessage = $state<string | null>(null);
  teamId = $state<string>('');
  successMessage = $state<string | null>(null);

  get processedCount() {
    return this.ingestedCount;
  }

  async handleFileUpload(file: File) {
    await this.setFile(file);
  }

  async setFile(file: File) {
    this.file = file;
    this.errorMessage = null;
    this.parsedRows = [];
    this.totalRowCount = 0;
    this.ingestedCount = 0;
    await this.parseCSV();
  }

  async parseCSV() {
    if (!this.file) return;

    this.isParsing = true;
    this.errorMessage = null;

    try {
      const result = await parseAndSanitizeCSV(this.file);

      if (!result.success) {
        this.errorMessage = result.error;
        this.parsedRows = [];
        this.totalRowCount = 0;
      } else {
        this.parsedRows = [...result.rows];
        this.totalRowCount = result.rows.length;
      }
    } catch (e: any) {
      this.errorMessage = `An unexpected error occurred while parsing: ${e.message}`;
    } finally {
      this.isParsing = false;
    }
  }

  async triggerIngestion() {
    const db = getActiveDb();
    if (!db || !authStore.isAuthenticated) {
      this.errorMessage = 'You must be authenticated and connected to the database to import rosters.';
      return;
    }

    if (this.parsedRows.length === 0) {
      this.errorMessage = 'No valid rows to import. Please upload a valid CSV first.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = null;
    this.successMessage = null;
    this.ingestedCount = 0;

    try {
      const csvPayload = Papa.unparse(this.parsedRows);
      const vampireIngestRows = httpsCallable(functions, 'vampireIngestRows');
      const res = await vampireIngestRows({ csvPayload, teamId: this.teamId });
      this.ingestedCount = (res.data as any).count || 0;
      this.successMessage = `Successfully ingested ${this.ingestedCount} rows.`;
    } catch (error: any) {
      this.errorMessage = `Upload failed during batch processing: ${error.message}`;
    } finally {
      this.isUploading = false;
    }
  }
}
