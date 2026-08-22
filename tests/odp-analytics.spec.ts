import { test, expect } from '@playwright/test';
import { GET } from '../src/routes/api/odp/analytics/+server';

test.describe('Coach OS - ODP State-Wide God-Mode Aggregate', () => {
  test('rejects requests missing valid authorization header', async () => {
    const mockRequest = new Request('http://localhost/api/odp/analytics', {
      headers: {}
    });

    const response = await GET({ request: mockRequest } as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('UNAUTHORIZED_ODP_ACCESS');
  });

  test('returns anonymized state-wide aggregate metrics without PII', async () => {
    const mockRequest = new Request('http://localhost/api/odp/analytics', {
      headers: { authorization: 'Bearer odp-auth-token' }
    });

    const response = await GET({ request: mockRequest } as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.totalActiveClubs).toBe(42);
    expect(body.data.totalPlayers).toBe(1850);
    expect(body.data).not.toHaveProperty('playerNames');
    expect(body.data).not.toHaveProperty('email');
  });
});
