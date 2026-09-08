import { vi, describe, it, expect, beforeEach } from 'vitest';
import { appendItem, navigateSafely, snapshotState } from '../stateHelpers';
import * as svelteReactivity from 'svelte/reactivity';
import * as svelte from 'svelte';
import * as navigation from '$app/navigation';

vi.mock('svelte/reactivity', () => ({
  snapshot: vi.fn()
}));

vi.mock('svelte', () => ({
  untrack: vi.fn((cb) => cb())
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

describe('stateHelpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('appendItem', () => {
    it('should append an item to an array', () => {
      const arr = [1, 2];
      const result = appendItem(arr, 3);
      expect(result).toEqual([1, 2, 3]);
      expect(result).not.toBe(arr);
    });
  });

  describe('navigateSafely', () => {
    it('should call untrack and goto', () => {
      navigateSafely('/test');
      expect(svelte.untrack).toHaveBeenCalled();
      expect(navigation.goto).toHaveBeenCalledWith('/test');
    });
  });

  describe('snapshotState', () => {
    it('should return snapshot when successful', () => {
      const mockState = { a: 1 };
      vi.mocked(svelteReactivity.snapshot).mockReturnValueOnce({ a: 1, snapshotted: true } as any);

      const result = snapshotState(mockState);
      expect(result).toEqual({ a: 1, snapshotted: true });
      expect(svelteReactivity.snapshot).toHaveBeenCalledWith(mockState);
    });

    it('should return original state if snapshot throws', () => {
      const mockState = { a: 1 };
      vi.mocked(svelteReactivity.snapshot).mockImplementationOnce(() => {
        throw new Error('snapshot failed');
      });

      const result = snapshotState(mockState);
      expect(result).toBe(mockState); // Should return exactly the original object
    });
  });
});
