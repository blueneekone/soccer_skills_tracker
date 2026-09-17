import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/svelte';
import RewardsHUD from './RewardsHUD.svelte';
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
vi.mock('$lib/components/ui/Icon.svelte', () => {
    // Basic valid Svelte 5 mock
    return {
        default: vi.fn().mockImplementation(() => {
            return {};
        })
    };
});

describe('RewardsHUD', () => {
    it('renders and toggles auto approve', async () => {
        let engine: RewardsEngine;
        untrack(() => {
            engine = new RewardsEngine();
            engine.autoApprove = false;
        });

        // Spy on engine method
        const toggleSpy = vi.spyOn(engine, 'toggleAutoApprove');
        
        render(RewardsHUD, { props: { engine } });
        
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).not.toBeChecked();

        await fireEvent.click(checkbox);
        
        expect(toggleSpy).toHaveBeenCalled();
    });
});
