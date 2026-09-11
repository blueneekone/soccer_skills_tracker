import { describe, it, expect, beforeEach } from 'vitest';
import { authStore } from '../auth.svelte.js';

describe('Auth Store Multi-Role', () => {
    beforeEach(() => {
        // Reset authStore state via hydrateForE2E
        authStore.hydrateForE2E({
            role: 'parent',
            roles: ['parent', 'assistant_coach'],
            isProfileComplete: true,
            clubId: 'test-club-id'
        });
        
        // Switch to valid initial
        authStore.switchContext('parent');
    });

    it('should initialize with primary role but allow activeContext', () => {
        expect(authStore.role).toBe('parent');
        expect(authStore.clubId).toBe('test-club-id');
        expect(authStore.activeContext).toBe('parent');
    });

    it('should switchContext to coach', () => {
        authStore.switchContext('assistant_coach');
        expect(authStore.activeContext).toBe('assistant_coach');
        // Primary role and claims should remain intact
        expect(authStore.role).toBe('parent');
        expect(authStore.clubId).toBe('test-club-id');
    });

    it('should restore activeContext to parent', () => {
        authStore.switchContext('assistant_coach');
        expect(authStore.activeContext).toBe('assistant_coach');
        authStore.switchContext('parent');
        expect(authStore.activeContext).toBe('parent');
    });

    it('should deny unauthorized role escalations', () => {
        authStore.switchContext('global_admin');
        expect(authStore.activeContext).toBe('parent'); // remains unchanged
    });
});
