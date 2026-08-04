import { test, expect, vi } from 'vitest';
import { federationService } from '../federation.svelte.ts';
import { db } from '$lib/firebase/config';
import { authStore } from '$lib/stores/auth/facade.svelte';

vi.mock('$lib/firebase/config', () => ({
  db: {}
}));

vi.mock('$lib/stores/auth/facade.svelte', () => ({
  authStore: {
    isAuthenticated: true
  }
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => ({
    docs: [
      {
        id: 'user1',
        data: () => ({
          role: 'player',
          tenantId: 'tenant1',
          clubId: 'club1',
          name: 'Player 1',
          player_stats: { pace: 50 },
          armory: { stats: { ACC: '4.0s' } }
        })
      }
    ]
  }))
}));

test('getOdpTalentPipeline', async () => {
  const players = await federationService.getOdpTalentPipeline('tenant1');
  expect(players).toHaveLength(1);
  expect(players[0].sixAxis).toHaveLength(6);
});
