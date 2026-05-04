/**
 * Timeline playback controller (pure logic — no DOM/SVG).
 * Uses Svelte 5 runes for reactive state readable by UI.
 */
import type { TacticalCartridge } from '$lib/states/war-room/types';

export class SimulatorEngine {
	isPlaying = $state(false);
	currentTime = $state(0);
	maxDuration = $state(5000);
	/** Wall-clock multiplier for timeline advance (1 = real-time). */
	playbackSpeed = $state(1);
	/** From last `loadCartridge` metadata.duration — combined with route orchestration in playback wiring. */
	timelineAuthorCapMs = $state(0);
	/** Cinematic sweep-reveal while hydrating a persisted cartridge (SVG mask + laser). */
	isLoadingCartridge = $state(false);
	/** Incremented each `loadCartridge` so SMIL sweep animations restart via `{#key}`. */
	cartridgeSweepEpoch = $state(0);

	private startTime = 0;
	private animationFrameId: number | null = null;
	private sweepClearTimer: ReturnType<typeof setTimeout> | null = null;

	/**
	 * Starts the 1.2s sweep sequence and applies timeline bounds from the cartridge.
	 * Caller must hydrate pitch bindables (`entities` / `routes`) before or synchronously with this call.
	 */
	loadCartridge(payload: TacticalCartridge) {
		this.pause();
		const dur = Number(payload.metadata?.duration);
		this.timelineAuthorCapMs = Number.isFinite(dur) && dur > 0 ? dur : 0;
		this.currentTime = 0;
		if (this.sweepClearTimer !== null) {
			clearTimeout(this.sweepClearTimer);
			this.sweepClearTimer = null;
		}
		this.cartridgeSweepEpoch += 1;
		this.isLoadingCartridge = true;
		this.sweepClearTimer = setTimeout(() => {
			this.isLoadingCartridge = false;
			this.sweepClearTimer = null;
		}, 1200);
	}

	/** Single playback toggle — UI must use this for transport (prevents play/pause RAF races). */
	togglePlay() {
		if (this.isPlaying) {
			this.pause();
			return;
		}

		if (this.currentTime >= this.maxDuration) {
			this.currentTime = 0;
		}

		this.isPlaying = true;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		const spd = Math.max(0.05, this.playbackSpeed);
		this.startTime = performance.now() - this.currentTime / spd;
		this.animationFrameId = requestAnimationFrame(this.tick);
	}

	play() {
		if (this.isPlaying) return;
		if (this.currentTime >= this.maxDuration) {
			this.currentTime = 0;
		}
		this.isPlaying = true;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
		const spd = Math.max(0.05, this.playbackSpeed);
		this.startTime = performance.now() - this.currentTime / spd;
		this.animationFrameId = requestAnimationFrame(this.tick);
	}

	pause() {
		this.isPlaying = false;
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
			this.animationFrameId = null;
		}
	}

	reset() {
		this.pause();
		this.currentTime = 0;
	}

	/** @param {number} timeMs */
	scrub(timeMs: number) {
		this.pause();
		const t = Math.max(0, Math.min(this.maxDuration, timeMs));
		this.currentTime = t;
	}

	private tick = () => {
		if (!this.isPlaying) return;
		const now = performance.now();
		const spd = Math.max(0.05, this.playbackSpeed);
		this.currentTime = (now - this.startTime) * spd;

		if (this.currentTime >= this.maxDuration) {
			this.currentTime = this.maxDuration;
			this.pause();
			return;
		}
		this.animationFrameId = requestAnimationFrame(this.tick);
	};
}
