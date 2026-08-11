import { isFirestoreReady } from '$lib/utils/firestoreGuard.js';

export class PremiumVideoEngine {
  selectedFile = $state<File | null>(null);
  error = $state<string | null>(null);
  isUploading = $state<boolean>(false);
  progress = $state<number>(0);
  success = $state<boolean>(false);
  scoreId = $state<string | null>(null);

  constructor() {
    this.reset();
  }

  reset() {
    this.selectedFile = null;
    this.error = null;
    this.isUploading = false;
    this.progress = 0;
    this.success = false;
    this.scoreId = null;
  }

  selectFile(file: File) {
    this.reset();
    const MAX_BYTES = 50 * 1024 * 1024; // 50MB-cap
    if (file.size > MAX_BYTES) {
      this.error = 'Video file size exceeds 50MB limit.';
      return;
    }
    this.selectedFile = file;
  }

  async uploadVideo(uploadFn?: (file: File) => Promise<{ scoreId: string }>) {
    if (!isFirestoreReady()) {
      this.error = 'Defensive Hydration Guard: Firestore is not ready.';
      return;
    }

    if (!this.selectedFile) {
      this.error = 'No video file selected.';
      return;
    }

    this.isUploading = true;
    this.progress = 10;
    this.error = null;

    try {
      if (uploadFn) {
        const result = await uploadFn(this.selectedFile);
        this.scoreId = result.scoreId;
      } else {
        // Fallback or mock upload behavior
        await new Promise((resolve) => setTimeout(resolve, 500));
        this.progress = 100;
        this.scoreId = crypto.randomUUID();
      }
      this.success = true;
      this.isUploading = false;
    } catch (err: any) {
      this.error = err?.message || 'Upload failed.';
      this.isUploading = false;
      this.progress = 0;
    }
  }
}
