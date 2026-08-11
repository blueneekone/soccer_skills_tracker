import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase/config';
import { authStore } from '$lib/stores/auth/facade.svelte';
import { getFirestore } from 'firebase/firestore';

export class VampireImporterEngine {
  isUploading = $state(false);
  processedCount = $state(0);
  errorMessage = $state('');
  successMessage = $state('');

  teamId = $state('');

  async handleFileUpload(file: File) {
    const db = getFirestore();
    if (!db || !authStore.isAuthenticated) {
      this.errorMessage = 'Database or user not ready.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.processedCount = 0;

    try {
      const csvPayload = await file.text();

      const vampireIngestRows = httpsCallable(functions, 'vampireIngestRows');
      const response = await vampireIngestRows({
        csvPayload,
        teamId: this.teamId || 'unknown_team'
      });

      const data = response.data as { count: number; success: boolean };
      if (data.success) {
        this.processedCount = data.count;
        this.successMessage = `Successfully ingested ${data.count} rows.`;
      }
    } catch (err: any) {
      this.errorMessage = err.message || 'Failed to upload CSV';
    } finally {
      this.isUploading = false;
    }
  }
}
