import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DopamineEngine } from '../DopamineEngine.svelte.ts';

const mockHttpsCallable = vi.fn();
vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(),
  httpsCallable: () => mockHttpsCallable
}));

vi.mock('$app/environment', () => ({ browser: true }));

describe('Skill Decay Persistence (Core Drive 8)', () => {
  let engine: DopamineEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new DopamineEngine();
  });

  it('calls syncDecayFromServer on hydrate instead of evaluateSkillDecay', async () => {
    mockHttpsCallable.mockResolvedValueOnce({ data: { applied: false } });
    engine.hydrate({});
    // Give time for promise to resolve since hydrate calls void syncDecayFromServer
    await new Promise(r => setTimeout(r, 10));
    expect(mockHttpsCallable).toHaveBeenCalled();
  });

  it('applies penalty when server returns applied: true', async () => {
    mockHttpsCallable.mockResolvedValueOnce({
      data: { applied: true, xpLost: 45, daysInactive: 6 }
    });

    engine.hydrate({});
    await new Promise(r => setTimeout(r, 10));

    expect(engine.decayPenaltyApplied).toBe(true);
    expect(engine.xpLost).toBe(45);
  });

  it('degrades gracefully on callable error', async () => {
    mockHttpsCallable.mockRejectedValueOnce(new Error('Network Error'));

    expect(() => {
      engine.hydrate({});
    }).not.toThrow();

    await new Promise(r => setTimeout(r, 10));
    expect(engine.decayPenaltyApplied).toBe(false);
  });
});
