import { describe, expect, it } from 'vitest';
import { CarRideEngine, type PublicScore } from '../../../routes/(app)/parent/dashboard/CarRideEngine.svelte';
import { Timestamp } from 'firebase/firestore';
import { deriveIsConsented } from '../../../lib/stores/auth/roleDerivations';

describe('Car Ride Home Protocol Embargo Gates', () => {
    it('locks out match metric dashboards for exactly 15 minutes post-game', () => {
        const engine = new CarRideEngine();

        // Match recorded 14 minutes ago
        engine.publicScore = {
            recordedAt: Timestamp.fromMillis(Date.now() - 14 * 60 * 1000)
        } as PublicScore;
        expect(engine.isTemporallyEmbargoed).toBe(true);

        // Match recorded 16 minutes ago
        engine.publicScore = {
            recordedAt: Timestamp.fromMillis(Date.now() - 16 * 60 * 1000)
        } as PublicScore;
        expect(engine.isTemporallyEmbargoed).toBe(false);
    });

    it('unauthenticated calls bypass the timestamp check and return empty states', async () => {
        const engine = new CarRideEngine();
        await engine.init('player@example.com', 'tenant1', 'club1');

        expect(engine.lockedMetrics).toBeNull();
    });
});

describe('COPPA 2.0 / VPC Verification', () => {
    it('pauses player data collection until VPC is authenticated', () => {
        // Player, minor, COPPA granted but VPC pending -> blocked
        expect(deriveIsConsented({
            isAuthenticated: true,
            isLoading: false,
            role: 'player',
            userProfile: { isMinor: true, coppaStatus: 'granted', vpcStatus: 'pending' }
        })).toBe(false);

        // Player, minor, COPPA pending but VPC verified -> blocked
        expect(deriveIsConsented({
            isAuthenticated: true,
            isLoading: false,
            role: 'player',
            userProfile: { isMinor: true, coppaStatus: 'pending', vpcStatus: 'verified' }
        })).toBe(false);

        // Player, minor, COPPA granted and VPC verified -> allowed
        expect(deriveIsConsented({
            isAuthenticated: true,
            isLoading: false,
            role: 'player',
            userProfile: { isMinor: true, coppaStatus: 'granted', vpcStatus: 'verified' }
        })).toBe(true);

        // Non-minors always pass
        expect(deriveIsConsented({
            isAuthenticated: true,
            isLoading: false,
            role: 'player',
            userProfile: { isMinor: false, coppaStatus: 'pending', vpcStatus: 'pending' }
        })).toBe(true);
    });
});
