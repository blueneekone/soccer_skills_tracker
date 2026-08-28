import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';

// Mock `onDocumentUpdated` before importing our module
vi.mock('firebase-functions/v2/firestore', () => {
    return {
        onDocumentUpdated: vi.fn((path, handler) => {
            // Return the raw handler so we can invoke it directly without the protobuf wrapper
            return handler;
        })
    };
});

// Avoid executing real cloud functions trigger code, mock wrapper
vi.mock('firebase-functions/logger', () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
}));

const mockSet = vi.fn().mockResolvedValue(true);
const mockDoc = vi.fn(() => ({ set: mockSet }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock('firebase-admin', () => {
    return {
        firestore: Object.assign(vi.fn(() => ({
            collection: mockCollection
        })), {
            FieldValue: {
                serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP')
            }
        })
    };
});

import { onUserProfileCleared } from '../triggers/userOnboardingTriggers';

describe('onUserProfileCleared Trigger', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const runTrigger = async (beforeData: any, afterData: any) => {
        const event = {
            data: {
                before: {
                    data: () => beforeData,
                    exists: true
                },
                after: {
                    data: () => afterData,
                    exists: true
                }
            },
            params: {
                userId: 'test_user_123'
            }
        };

        // Since we mocked onDocumentUpdated to just return the handler, we can invoke it directly
        await (onUserProfileCleared as any)(event);
    };

    it('should fire welcome email for director when cleared status changes to true', async () => {
        await runTrigger(
            { isCleared: false, role: 'director' },
            { isCleared: true, role: 'director', email: 'director@test.com', firstName: 'Dirk' }
        );

        expect(mockCollection).toHaveBeenCalledWith('mail');
        expect(mockDoc).toHaveBeenCalledWith('test_user_123-welcome');
        expect(mockSet).toHaveBeenCalled();

        const payload = mockSet.mock.calls[0][0];
        expect(payload.to).toBe('director@test.com');
        expect(payload.message.subject).toContain('Welcome to SSTracker: Your Unified Operations Base is Ready');
        expect(payload.message.html).toContain('Welcome to the Command Plane, Dirk');
        expect(payload.message.html).toContain('Vampire Roster Importer');
    });

    it('should fire welcome email for coach when cleared status changes to true', async () => {
        await runTrigger(
            { isCleared: false, role: 'coach' },
            { isCleared: true, role: 'coach', email: 'coach@test.com', firstName: 'Coach Dan' }
        );

        expect(mockSet).toHaveBeenCalled();

        const payload = mockSet.mock.calls[0][0];
        expect(payload.to).toBe('coach@test.com');
        expect(payload.message.subject).toContain('Sideline SIEM Active: Welcome to Coach OS');
        expect(payload.message.html).toContain('Sideline SIEM Active, Coach Dan');
        expect(payload.message.html).toContain('Lightning Proximity Radar alerts');
    });

    it('should fire welcome email for parent when role is assigned (no bg check required)', async () => {
        // Parent doesn't need bg check, so going from no role to parent role should fire it
        await runTrigger(
            { role: null },
            { role: 'parent', email: 'parent@test.com', firstName: 'Pam' }
        );

        expect(mockSet).toHaveBeenCalled();

        const payload = mockSet.mock.calls[0][0];
        expect(payload.to).toBe('parent@test.com');
        expect(payload.message.subject).toContain('Compliance Shield Active: Welcome to Parent OS');
        expect(payload.message.html).toContain('Compliance Shield Active, Pam');
        expect(payload.message.html).toContain('Vanguard Prism radar charts');
    });

    it('should not fire if user was already cleared', async () => {
        await runTrigger(
            { isCleared: true, role: 'coach' },
            { isCleared: true, role: 'coach', email: 'coach@test.com' }
        );

        expect(mockSet).not.toHaveBeenCalled();
    });
});
