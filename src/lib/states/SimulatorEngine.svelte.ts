/**
 * Timeline playback controller (pure logic — no DOM/SVG).
 * Uses Svelte 5 runes for reactive state readable by UI.
 */
export class SimulatorEngine {
	isPlaying = $state(false);
	currentTime = $state(0);
	maxDuration = $state(5000);

	private startTime = 0;
	private animationFrameId: number | null = null;

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
		this.startTime = performance.now() - this.currentTime;
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
		this.startTime = performance.now() - this.currentTime;
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
		this.currentTime = now - this.startTime;

		if (this.currentTime >= this.maxDuration) {
			this.currentTime = this.maxDuration;
			this.pause();
			return;
		}
		this.animationFrameId = requestAnimationFrame(this.tick);
	};
}
