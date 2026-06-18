import { describe, it, expect, vi } from 'vitest';
import { MissionSnapshotRetryGate } from '../missionRailAuth.js';

describe('MissionSnapshotRetryGate', () => {
	it('retries once then blocks', () => {
		const gate = new MissionSnapshotRetryGate();
		const onRetry = vi.fn();
		const onBlocked = vi.fn();

		gate.onError(onRetry, onBlocked);
		gate.onError(onRetry, onBlocked);

		expect(onRetry).toHaveBeenCalledTimes(1);
		expect(onBlocked).toHaveBeenCalledTimes(1);
	});

	it('resets after successful snapshot', () => {
		const gate = new MissionSnapshotRetryGate();
		const onRetry = vi.fn();
		const onBlocked = vi.fn();

		gate.onError(onRetry, onBlocked);
		gate.onSuccess();
		gate.onError(onRetry, onBlocked);

		expect(onRetry).toHaveBeenCalledTimes(2);
		expect(onBlocked).not.toHaveBeenCalled();
	});
});
