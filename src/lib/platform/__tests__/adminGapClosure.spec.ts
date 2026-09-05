import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handle } from '../../../hooks.server';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getApps, initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Mock dependencies
vi.mock('firebase-admin/app', () => ({
    getApps: vi.fn(() => []),
    initializeApp: vi.fn(),
    cert: vi.fn(),
    applicationDefault: vi.fn()
}));

vi.mock('firebase-admin/auth', () => ({
    getAuth: vi.fn()
}));

vi.mock('firebase-admin/firestore', () => {
    return {
        getFirestore: vi.fn()
    };
});

vi.mock('node:fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:fs')>();
    return {
        ...actual,
        readFileSync: vi.fn()
    };
});

vi.mock('node:path', async (importOriginal) => {
    const actual = await importOriginal<typeof import('node:path')>();
    return {
        ...actual,
        resolve: vi.fn()
    };
});

vi.mock('$env/dynamic/private', () => ({
    env: { FIREBASE_SERVICE_ACCOUNT_JSON: null }
}));

describe('Admin OS Global Gap Closure (TDD Verification Harness)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('1. Maintenance Hook Gate', () => {
        it('should redirect non-admin user to /maintenance when maintenanceMode is true', async () => {
            // Mock firestore response for maintenance
            const mockDocGet = vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ maintenanceMode: true })
            });
            const mockCollection = vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({ get: mockDocGet })
            });
            vi.mocked(getFirestore).mockReturnValue({
                collection: mockCollection
            } as any);

            // Mock auth verification
            const verifyIdTokenMock = vi.fn().mockResolvedValue({
                uid: 'user123',
                email: 'test@example.com',
                role: 'coach',
                clubId: 'club1'
            });
            vi.mocked(getAuth).mockReturnValue({
                verifyIdToken: verifyIdTokenMock
            } as any);

            const event = {
                cookies: { get: vi.fn().mockReturnValue('mock_token') },
                request: { headers: { get: vi.fn() } },
                locals: {},
                url: { pathname: '/dashboard' }
            };

            const resolve = vi.fn().mockResolvedValue(new Response('OK'));

            const response = await handle({ event, resolve } as any);

            expect(response.status).toBe(307);
            expect(response.headers.get('location')).toBe('/maintenance');
        });

        it('should allow admin user to access /dashboard even when maintenanceMode is true', async () => {
            // Mock firestore response for maintenance
            const mockDocGet = vi.fn().mockResolvedValue({
                exists: true,
                data: () => ({ maintenanceMode: true })
            });
            const mockCollection = vi.fn().mockReturnValue({
                doc: vi.fn().mockReturnValue({ get: mockDocGet })
            });
            vi.mocked(getFirestore).mockReturnValue({
                collection: mockCollection
            } as any);

            // Mock auth verification - Admin Role
            const verifyIdTokenMock = vi.fn().mockResolvedValue({
                uid: 'admin123',
                email: 'admin@example.com',
                role: 'admin',
                clubId: 'system'
            });
            vi.mocked(getAuth).mockReturnValue({
                verifyIdToken: verifyIdTokenMock
            } as any);

            const event = {
                cookies: { get: vi.fn().mockReturnValue('mock_admin_token') },
                request: { headers: { get: vi.fn() } },
                locals: {},
                url: { pathname: '/dashboard' }
            };

            const resolve = vi.fn().mockResolvedValue(new Response('OK', { status: 200 }));

            const response = await handle({ event, resolve } as any);

            expect(response.status).toBe(200);
            expect(resolve).toHaveBeenCalled();
        });
    });
});
