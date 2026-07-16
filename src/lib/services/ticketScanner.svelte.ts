/**
 * ticketScanner.svelte.ts
 * ────────────────────────
 * Phase 2, Epic 2 — Session A6: Gate scanner state machine.
 *
 * Wraps `html5-qrcode` camera scanning and the `verifyScanToken` callable.
 * Implements an offline queue (IndexedDB) so pending scans are replayed
 * when connectivity returns.
 *
 * Lifecycle:
 *   idle → scanning (camera active) → verifying → result → scanning
 *                                  ↘ offline_queued → (replayed on reconnect)
 *
 * Usage:
 *   import { createTicketScanner } from '$lib/services/ticketScanner.svelte.js';
 *   const scanner = createTicketScanner(eventId, mountId);
 *   await scanner.start();
 *   // bind scanner.state for UI
 *   onDestroy(() => scanner.stop());
 */

import { browser } from '$app/environment';
import { httpsCallable } from 'firebase/functions';
import { functions } from '$lib/firebase.js';

// ── Types ─────────────────────────────────────────────────────────────────

export type ScanResultStatus = 'valid' | 'already_scanned' | 'invalid' | 'error';

export interface ScanResult {
	status: ScanResultStatus;
	ticketId?: string;
	checkedInAt?: string;
	errorMsg?: string;
	qrToken: string;
	timestamp: number;
	queued?: boolean;
}

export interface ScannerStats {
	valid: number;
	invalid: number;
	already_scanned: number;
	queued: number;
}

export interface ScannerState {
	phase: 'idle' | 'starting' | 'scanning' | 'verifying' | 'result' | 'error';
	lastResult: ScanResult | null;
	stats: ScannerStats;
	errorMsg: string;
	isOnline: boolean;
	queueSize: number;
}

// ── IndexedDB offline queue ───────────────────────────────────────────────

const IDB_NAME = 'vanguard_scan_queue';
const IDB_STORE = 'pending_scans';
const IDB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(IDB_NAME, IDB_VERSION);
		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(IDB_STORE)) {
				db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
			}
		};
		req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
		req.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
	});
}

async function queueScan(eventId: string, qrToken: string): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(IDB_STORE, 'readwrite');
	tx.objectStore(IDB_STORE).add({ eventId, qrToken, queuedAt: Date.now() });
}

async function getPendingScans(): Promise<Array<{ id: number; eventId: string; qrToken: string }>> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readonly');
		const req = tx.objectStore(IDB_STORE).getAll();
		req.onsuccess = (e) => resolve((e.target as IDBRequest).result);
		req.onerror = (e) => reject((e.target as IDBRequest).error);
	});
}

async function deletePendingScan(id: number): Promise<void> {
	const db = await openDb();
	const tx = db.transaction(IDB_STORE, 'readwrite');
	tx.objectStore(IDB_STORE).delete(id);
}

async function countPendingScans(): Promise<number> {
	const db = await openDb();
	return new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readonly');
		const req = tx.objectStore(IDB_STORE).count();
		req.onsuccess = (e) => resolve((e.target as IDBRequest).result);
		req.onerror = (e) => reject((e.target as IDBRequest).error);
	});
}

// ── Scanner factory ───────────────────────────────────────────────────────

/** Debounce window to prevent duplicate scans of the same QR. */
const SCAN_DEBOUNCE_MS = 3000;

export function createTicketScanner(eventId: string, mountId = 'qr-reader') {
	const state = $state<ScannerState>({
		phase: 'idle',
		lastResult: null,
		stats: { valid: 0, invalid: 0, already_scanned: 0, queued: 0 },
		errorMsg: '',
		isOnline: browser ? navigator.onLine : true,
		queueSize: 0,
	});

	 
	let html5QrScanner: any = null;
	let lastScannedToken = '';
	let lastScannedAt = 0;
	let replayInterval: ReturnType<typeof setInterval> | null = null;

	// ── Online / offline detection ─────────────────────────────────────────

	function handleOnline() {
		state.isOnline = true;
		replayQueue();
	}
	function handleOffline() { state.isOnline = false; }

	// ── verifyScanToken callable ───────────────────────────────────────────

	async function verifyOnline(qrToken: string): Promise<ScanResult> {
		const fns = functions;
		const verify = httpsCallable<
			{ eventId: string; qrToken: string },
			{ valid: boolean; status: ScanResultStatus; checkedInAt?: string }
		>(fns, 'verifyScanToken');
		const res = await verify({ eventId, qrToken });
		return {
			status: res.data.status,
			checkedInAt: res.data.checkedInAt,
			qrToken,
			timestamp: Date.now(),
		};
	}

	// ── Offline queue replay ───────────────────────────────────────────────

	async function replayQueue() {
		if (!state.isOnline) return;
		const pending = await getPendingScans();
		for (const item of pending) {
			try {
				const result = await verifyOnline(item.qrToken);
				await deletePendingScan(item.id);
				if (result.status === 'valid') state.stats.valid++;
				else if (result.status === 'already_scanned') state.stats.already_scanned++;
				else state.stats.invalid++;
			} catch {
				// Leave in queue for next replay.
			}
		}
		state.queueSize = await countPendingScans();
		state.stats.queued = state.queueSize;
	}

	// ── QR decode handler ─────────────────────────────────────────────────

	async function onScanSuccess(decodedText: string) {
		const now = Date.now();
		// Debounce: ignore re-scans of same token within window.
		if (decodedText === lastScannedToken && now - lastScannedAt < SCAN_DEBOUNCE_MS) return;
		lastScannedToken = decodedText;
		lastScannedAt = now;

		state.phase = 'verifying';
		state.errorMsg = '';

		let result: ScanResult;
		if (!state.isOnline) {
			await queueScan(eventId, decodedText);
			state.queueSize = await countPendingScans();
			state.stats.queued = state.queueSize;
			result = { status: 'valid', qrToken: decodedText, timestamp: now, queued: true };
			// Optimistic "queued" — show as valid so the gate doesn't block.
		} else {
			try {
				result = await verifyOnline(decodedText);
			} catch (e: unknown) {
				// Network error mid-scan — queue it.
				await queueScan(eventId, decodedText);
				state.queueSize = await countPendingScans();
				result = {
					status: 'valid',
					qrToken: decodedText,
					timestamp: now,
					queued: true,
					errorMsg: e instanceof Error ? e.message : String(e),
				};
			}
		}

		state.lastResult = result;
		state.phase = 'result';

		// Update stats (queued scans are optimistic valid).
		if (!result.queued) {
			if (result.status === 'valid') state.stats.valid++;
			else if (result.status === 'already_scanned') state.stats.already_scanned++;
			else state.stats.invalid++;
		}

		// Play a tone using the Web Audio API for quick gate feedback.
		playTone(result.status, result.queued);

		// Return to scanning after a brief display window.
		setTimeout(() => {
			state.phase = 'scanning';
		}, 2500);
	}

	// ── Audio feedback ────────────────────────────────────────────────────

	function playTone(status: ScanResultStatus, queued?: boolean) {
		if (!browser) return;
		try {
			 
			const ctx = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.connect(gain);
			gain.connect(ctx.destination);
			gain.gain.setValueAtTime(0.4, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
			if (queued) {
				osc.frequency.setValueAtTime(660, ctx.currentTime);
			} else if (status === 'valid') {
				osc.frequency.setValueAtTime(880, ctx.currentTime);
			} else if (status === 'already_scanned') {
				osc.frequency.setValueAtTime(440, ctx.currentTime);
			} else {
				osc.frequency.setValueAtTime(220, ctx.currentTime);
			}
			osc.type = status === 'invalid' ? 'sawtooth' : 'sine';
			osc.start(ctx.currentTime);
			osc.stop(ctx.currentTime + 0.4);
		} catch { /* AudioContext not supported */ }
	}

	// ── Public API ────────────────────────────────────────────────────────

	async function start() {
		if (!browser) return;
		state.phase = 'starting';
		state.errorMsg = '';

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);

		// Kick off queue replay loop every 30s.
		replayInterval = setInterval(replayQueue, 30_000);
		state.queueSize = await countPendingScans();
		state.stats.queued = state.queueSize;

		try {
			const { Html5QrcodeScanner } = await import('html5-qrcode');
			html5QrScanner = new Html5QrcodeScanner(
				mountId,
				{ fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true },
				false,
			);
			html5QrScanner.render(onScanSuccess, () => { /* error per frame — ignore */ });
			state.phase = 'scanning';
		} catch (e: unknown) {
			state.phase = 'error';
			state.errorMsg = e instanceof Error ? e.message : String(e);
		}
	}

	async function stop() {
		if (html5QrScanner) {
			try { await html5QrScanner.clear(); } catch { /* ignore */ }
			html5QrScanner = null;
		}
		if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
		state.phase = 'idle';
	}

	return {
		get state() { return state; },
		start,
		stop,
	};
}
