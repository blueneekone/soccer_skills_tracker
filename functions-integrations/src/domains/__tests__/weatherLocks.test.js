import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { triggerWeatherLockdown } = await import('../weatherLocks.js');

vi.mock('firebase-functions/logger', () => ({
    info: vi.fn(),
    error: vi.fn()
}));

vi.mock('firebase-admin', () => ({
    default: {
        firestore: {
            FieldValue: { serverTimestamp: () => 'MOCK_TIMESTAMP' }
        }
    }
}));

describe('weatherLocks - Automated Lockdown & Broadcast', () => {
    let mockDb;
    let mockBatch;
    let mockSchedulesRef;
    let mockSchedSnap;

    beforeEach(() => {
        mockBatch = {
            update: vi.fn(),
            set: vi.fn(),
            commit: vi.fn().mockResolvedValue()
        };

        mockSchedSnap = {
            empty: false,
            docs: [
                { ref: 'doc1_ref', data: () => ({ teamId: 'teamA' }) },
                { ref: 'doc2_ref', data: () => ({ teamId: 'teamB' }) }
            ]
        };

        mockSchedulesRef = {
            where: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue(mockSchedSnap)
        };

        const mockBroadcastRef = { id: 'br_doc_1' };

        mockDb = {
            collection: vi.fn((coll) => {
                if (coll === 'schedules') return mockSchedulesRef;
                if (coll === 'team_broadcasts') return { doc: vi.fn().mockReturnValue(mockBroadcastRef) };
            }),
            batch: vi.fn().mockReturnValue(mockBatch)
        };
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('should mutate active schedules to locked and suspended', async () => {
        await triggerWeatherLockdown('club_123', mockDb);

        // Assertions for schedule mutations
        expect(mockBatch.update).toHaveBeenCalledTimes(2);
        expect(mockBatch.update).toHaveBeenCalledWith('doc1_ref', {
            fieldStatus: 'locked',
            sessionStatus: 'suspended'
        });

        // Assertions for Shadow CC Broadcasts
        expect(mockBatch.set).toHaveBeenCalledTimes(2);
        expect(mockBatch.set).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                teamId: 'teamA',
                clubId: 'club_123',
                type: 'emergency_broadcast',
                channelType: 'parent_lounge',
                safesportMonitored: true
            })
        );
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
    });

    it('should handle empty schedule snapshot gracefully', async () => {
        mockSchedulesRef.get = vi.fn().mockResolvedValue({ empty: true });

        await triggerWeatherLockdown('club_123', mockDb);

        expect(mockBatch.update).not.toHaveBeenCalled();
        expect(mockBatch.set).not.toHaveBeenCalled();
        expect(mockBatch.commit).not.toHaveBeenCalled();
    });
});
