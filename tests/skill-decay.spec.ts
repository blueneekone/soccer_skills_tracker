import { test, expect } from '@playwright/test';
import { calculateSkillDecay } from '../src/lib/services/player/skillDecay';

test.describe('Player OS - Skill Decay Persistence', () => {
  test('decrements target skill nodes by 1% per 72 hours of training inactivity', () => {
    const NOW = 1700000000000;
    const SEVENTY_TWO_HOURS = 72 * 60 * 60 * 1000;

    const initialNodes = [
      { id: 'dribbling', name: 'Dribbling', level: 100, lastTrainedTimestamp: NOW - SEVENTY_TWO_HOURS },
      { id: 'passing', name: 'Passing', level: 80, lastTrainedTimestamp: NOW - (10 * 60 * 1000) }
    ];

    const result = calculateSkillDecay(initialNodes, NOW);

    expect(result.decayedCount).toBe(1);
    expect(result.updatedNodes[0].level).toBe(99);
    expect(result.updatedNodes[1].level).toBe(80);
  });
});
