import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';
import type { ArmoryEngine } from '$lib/states/ArmoryEngine.svelte.js';

export type Phase =
	| 'idle'
	| 'selected'
	| 'uploading'
	| 'analyzing'
	| 'result'
	| 'confirming'
	| 'complete'
	| 'error';

export interface AnalysisResult {
	stat: string;
	delta: number;
	statDelta: string;
	headline: string;
	confidence: number;
	feedbackPoints: string[];
}

export const STAT_LABELS: Record<string, string> = {
	PAC: 'PACE',
	ACC: 'ACCELERATION',
	AGI: 'AGILITY',
	STM: 'STAMINA',
	POW: 'POWER',
	VAN: 'VANGUARD RATING',
};

const CLIP_POLL_INTERVAL_MS = 2_000;
const CLIP_POLL_MAX_MS = 120_000;

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

function parseAnalysisResult(raw: unknown): AnalysisResult | null {
	if (!raw || typeof raw !== 'object') return null;
	const r = raw as Record<string, unknown>;
	const stat = typeof r.stat === 'string' ? r.stat : '';
	const headline = typeof r.headline === 'string' ? r.headline.trim() : '';
	if (!stat || !headline) return null;
	return {
		stat,
		delta: typeof r.delta === 'number' && Number.isFinite(r.delta) ? r.delta : 0,
		statDelta: typeof r.statDelta === 'string' ? r.statDelta : '',
		headline,
		confidence: typeof r.confidence === 'number' && Number.isFinite(r.confidence) ? r.confidence : 0,
		feedbackPoints: Array.isArray(r.feedbackPoints)
			? r.feedbackPoints.filter((x): x is string => typeof x === 'string')
			: [],
	};
}

export class ClipAnalyzerEngine {
	armory = $state<ArmoryEngine>({} as any);
	playerUid = $state('');
	targetStat = $state<'PAC' | 'ACC' | 'AGI' | 'STM' | 'POW' | 'VAN'>('PAC');
	onClipReady = $state<((clipId: string, publicUrl: string) => void) | undefined>(undefined);

	phase = $state<Phase>('idle');
	selectedFile = $state<File | null>(null);
	uploadProgress = $state(0);
	clipId = $state<string | null>(null);
	publicUrl = $state<string | null>(null);
	analysisResult = $state<AnalysisResult | null>(null);
	errorMsg = $state('');
	scanLine = $state(0);
	scanInterval: ReturnType<typeof setInterval> | null = null;

	isVideo = $derived(this.selectedFile?.type.startsWith('video/') ?? false);
	fileLabel = $derived(this.selectedFile ? `${this.selectedFile.name} (${(this.selectedFile.size / 1024 / 1024).toFixed(1)} MB)` : '');
	targetStatLabel = $derived(STAT_LABELS[this.targetStat] ?? this.targetStat);

	confidenceColor = $derived.by(() => {
		const c = this.analysisResult?.confidence ?? 0;
		if (c >= 85) return '#14b8a6';
		if (c >= 65) return '#f59e0b';
		return '#ff003c';
	});

	constructor(props: {
		armory: ArmoryEngine;
		playerUid: string;
		targetStat?: 'PAC' | 'ACC' | 'AGI' | 'STM' | 'POW' | 'VAN';
		onClipReady?: (clipId: string, publicUrl: string) => void;
	}) {
		this.armory = props.armory;
		this.playerUid = props.playerUid;
		if (props.targetStat) this.targetStat = props.targetStat;
		if (props.onClipReady) this.onClipReady = props.onClipReady;
	}

	onFileChange(ev: Event): void {
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (file.type.startsWith('video/') && file.size > 50 * 1024 * 1024) {
			this.errorMsg = 'Video must be under 50 MB.';
			return;
		}

		this.selectedFile = file;
		this.phase = 'selected';
		this.errorMsg = '';
		this.uploadProgress = 0;
		this.analysisResult = null;
	}

	reset(): void {
		this.phase = 'idle';
		this.selectedFile = null;
		this.uploadProgress = 0;
		this.clipId = null;
		this.publicUrl = null;
		this.analysisResult = null;
		this.errorMsg = '';
		this.stopScan();
	}

	startScan(): void {
		this.stopScan();
		this.scanLine = 0;
		this.scanInterval = setInterval(() => {
			this.scanLine = (this.scanLine + 1.8) % 100;
		}, 30);
	}

	stopScan(): void {
		if (this.scanInterval !== null) {
			clearInterval(this.scanInterval);
			this.scanInterval = null;
		}
	}

	async waitForClipProcessing(
		uid: string,
		processedClipId: string
	): Promise<{ status: string; publicUrl?: string; analysisResult?: AnalysisResult | null; error?: string }> {
		if (!db || !authStore.isAuthenticated) return { status: 'unauthenticated' };
		const ref = doc(db, 'player_media', uid, 'clips', processedClipId);
		const deadline = Date.now() + CLIP_POLL_MAX_MS;
		while (Date.now() < deadline) {
			const snap = await getDoc(ref);
			if (snap.exists()) {
				const data = snap.data();
				const status = typeof data.status === 'string' ? data.status : 'pending';
				if (status === 'ready') {
					return {
						status,
						publicUrl: typeof data.publicUrl === 'string' ? data.publicUrl : undefined,
						analysisResult: parseAnalysisResult(data.analysisResult),
					};
				}
				if (status === 'quarantined') {
					return {
						status,
						error: typeof data.safetyReason === 'string' && data.safetyReason.trim() ? data.safetyReason : 'Clip failed safety review.',
					};
				}
				if (status === 'error') {
					return {
						status,
						error: typeof data.error === 'string' && data.error.trim() ? data.error : 'Media processing failed.',
					};
				}
			}
			await sleep(CLIP_POLL_INTERVAL_MS);
		}
		return {
			status: 'timeout',
			error: 'Processing is taking longer than expected. Check the media vault in a minute.',
		};
	}

	async startAnalysis(): Promise<void> {
		if (!db || !authStore.isAuthenticated) return;
		if (!this.selectedFile) return;
		this.phase = 'uploading';
		this.errorMsg = '';
		this.startScan();

		try {
			const fns = functions;
			const getUploadTokenFn = httpsCallable<
				{ mimeType: string; fileName: string; targetStat: string },
				{ signedUrl: string; storagePath: string; clipId: string; expiresAt: string }
			>(fns, 'getUploadToken');

			const tokenRes = await getUploadTokenFn({
				mimeType: this.selectedFile.type,
				fileName: this.selectedFile.name,
				targetStat: this.targetStat,
			});

			const { signedUrl, clipId: cId } = tokenRes.data;
			this.clipId = cId;

			await new Promise<void>((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.upload.onprogress = (ev) => {
					if (ev.lengthComputable) this.uploadProgress = Math.round((ev.loaded / ev.total) * 100);
				};
				xhr.onload = () => {
					if (xhr.status >= 200 && xhr.status < 300) resolve();
					else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
				};
				xhr.onerror = () => reject(new Error('Upload network error.'));
				xhr.open('PUT', signedUrl);
				xhr.setRequestHeader('Content-Type', this.selectedFile!.type);
				xhr.send(this.selectedFile);
			});

			this.uploadProgress = 100;
			this.phase = 'analyzing';

			const processed = await this.waitForClipProcessing(this.playerUid, cId);
			this.stopScan();

			if (processed.status === 'quarantined' || processed.status === 'error') {
				this.errorMsg = processed.error ?? 'Clip could not be processed.';
				this.phase = 'error';
				return;
			}

			if (processed.publicUrl) this.publicUrl = processed.publicUrl;
			if (this.clipId && this.publicUrl) this.onClipReady?.(this.clipId, this.publicUrl);

			if (processed.analysisResult) {
				this.analysisResult = processed.analysisResult;
				this.phase = 'result';
				return;
			}

			if (processed.status === 'timeout') {
				this.errorMsg = processed.error ?? 'Processing timed out.';
				this.phase = 'error';
				return;
			}

			this.analysisResult = null;
			this.phase = 'complete';
		} catch (err: unknown) {
			this.errorMsg = err instanceof Error ? err.message : 'Upload failed.';
			this.phase = 'error';
			this.stopScan();
		}
	}

	async confirmResult(): Promise<void> {
		if (!this.analysisResult || this.analysisResult.delta <= 0) return;
		this.phase = 'confirming';
		try {
			this.armory.awardXP(this.analysisResult.delta, `AI Biomechanics: ${this.analysisResult.headline}`);
			if (this.clipId && this.publicUrl) this.onClipReady?.(this.clipId, this.publicUrl);
			this.phase = 'complete';
		} catch (err: unknown) {
			this.errorMsg = err instanceof Error ? err.message : 'Failed to apply result.';
			this.phase = 'error';
		}
	}
}
