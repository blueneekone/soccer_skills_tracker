import { describe, it, expect, vi, beforeEach } from 'vitest';
import { untrack } from 'svelte';
import { RewardsEngine } from './RewardsEngine.svelte.js';

// authStore mocked
vi.mock('$lib/stores/auth.svelte.js', () => ({
    authStore: {
        get isAuthenticated() { return true; },
        get claims() { return { householdId: 'h1' }; }
    }
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(() => ({})),
    doc: vi.fn(),
    onSnapshot: vi.fn((ref, cb) => {
        cb({ exists: () => true, data: () => ({ autoApproveRewards: true }) });
        return vi.fn();
    }),
    setDoc: vi.fn()
}));

vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn(() => vi.fn(() => Promise.resolve({ data: { campaigns: [{ id: '1', name: 'Test' }] } })))
}));

describe('RewardsEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes and loads catalog', async () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
        });
        
        expect(engine!.autoApprove).toBe(true);
        // Assuming loading async completes
        await new Promise(r => setTimeout(r, 0));
        expect(engine!.rewards.length).toBe(1);
        expect(engine!.rewards[0].name).toBe('Test');
    });

    it('toggles auto approve', async () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
        });
        await new Promise(r => setTimeout(r, 0));
        
        await engine!.toggleAutoApprove();
        expect(engine!.autoApprove).toBe(false);
    });

    it('fails to issue reward without funding source', async () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
        });
        await engine!.issueReward('c1', 10, 'ch1', 'm1');
        expect(engine!.error).toBe('Please provide a funding source ID.');
    });

    it('issues reward', async () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
            engine.fundingSourceId = 'fs1';
        });
        await engine!.issueReward('c1', 10, 'ch1', 'm1');
        expect(engine!.error).toBe(''); // no error
    });
});
