import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import RewardsArena from './RewardsArena.svelte';
import { RewardsEngine } from './RewardsEngine.svelte.js';
import { untrack } from 'svelte';
import '@testing-library/jest-dom';

vi.mock('$lib/stores/auth.svelte.js', () => ({
    authStore: {
        get isAuthenticated() { return true; },
        get claims() { return { householdId: 'h1' }; }
    }
}));
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(), doc: vi.fn(), onSnapshot: vi.fn(), setDoc: vi.fn()
}));
vi.mock('firebase/functions', () => ({
    getFunctions: vi.fn(), httpsCallable: vi.fn()
}));
vi.mock('$lib/components/ui/Icon.svelte', () => ({
    default: vi.fn().mockImplementation(() => {
        return {};
    })
}));

describe('RewardsArena', () => {
    it('renders loading state', () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
            engine.loading = true;
        });
        
        render(RewardsArena, { props: { engine } });
        expect(screen.getByText('Loading catalog...')).toBeInTheDocument();
    });

    it('renders rewards', () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
            engine.loading = false;
            engine.rewards = [{ id: '1', name: 'Test Card' }];
        });

        render(RewardsArena, { props: { engine } });
        expect(screen.getByText('Test Card')).toBeInTheDocument();
    });
});
