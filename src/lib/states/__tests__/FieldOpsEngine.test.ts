import { describe, it, expect, vi } from 'vitest';
import { FieldOpsEngine } from '../FieldOpsEngine.svelte.js';

describe('FieldOpsEngine', () => {
	it('initializes with clear status', () => {
		const engine = new FieldOpsEngine();
		expect(engine.status).toBe('CLEAR');
		expect(engine.latitude).toBeNull();
		expect(engine.longitude).toBeNull();
	});

	it('updates alert state correctly', () => {
		const engine = new FieldOpsEngine();
		engine.updateAlertState('LOCKED_WEATHER_ALERT', 40.0, -74.0, 'Lightning proximity');
		expect(engine.status).toBe('LOCKED_WEATHER_ALERT');
		expect(engine.latitude).toBe(40.0);
		expect(engine.longitude).toBe(-74.0);
		expect(engine.lockReason).toBe('Lightning proximity');
		expect(engine.lastAlertAt).toBeInstanceOf(Date);
	});

	it('setupMapListeners aborts if authStore is not authenticated', () => {
		vi.mock('$lib/firebase.js', () => ({
			getActiveDb: () => ({})
		}));
		vi.mock('$lib/stores/auth/facade.svelte.js', () => ({
			authStore: { isAuthenticated: false }
		}));

		const engine = new FieldOpsEngine();
		const mockCanvas = {
			addEventListener: vi.fn()
		} as any;

		engine.setupMapListeners(mockCanvas);
		expect(mockCanvas.addEventListener).not.toHaveBeenCalled();
	});
});
