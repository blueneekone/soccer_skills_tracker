import { getActiveDb } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth/facade.svelte.js';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { parseAndSanitizeCSV, type VampireRow } from '$lib/utils/vampireSanitizer.js';

export class VampireImporterEngine {
  file = $state<File | null>(null);
  isParsing = $state<boolean>(false);
  isUploading = $state<boolean>(false);
  parsedRows = $state<VampireRow[]>([]);
  totalRowCount = $state<number>(0);
  ingestedCount = $state<number>(0);
  errorMessage = $state<string | null>(null);

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
    this.ingestedCount = 0;

    try {
      const BATCH_LIMIT = 500;
      const rows = [...this.parsedRows];
      const collectionRef = collection(db, 'roster_staging');

      for (let i = 0; i < rows.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const currentBatchRows = rows.slice(i, i + BATCH_LIMIT);

        for (const row of currentBatchRows) {
          const docRef = doc(collectionRef); // auto-generate ID
          batch.set(docRef, {
            ...row,
            uploadedAt: new Date().toISOString(),
            uploadedBy: authStore.user?.uid || 'unknown'
          });
        }

        await batch.commit();
        this.ingestedCount = this.ingestedCount + currentBatchRows.length;
      }
    } catch (error: any) {
      this.errorMessage = `Upload failed during batch processing: ${error.message}`;
    } finally {
      this.isUploading = false;
    }
  }
}
