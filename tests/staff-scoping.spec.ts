import { test, expect } from '@playwright/test';
import { scopePlayerMetricsForStaff, type AssistantCoach, type PlayerMetric } from '../src/lib/services/coach/staffScoping';

test.describe('Coach OS - Multi-Assistant Scoping Guard', () => {
  const allMetrics: PlayerMetric[] = [
    { playerId: 'p1', name: 'Player One', metricValue: 90 },
    { playerId: 'p2', name: 'Player Two', metricValue: 85 },
    { playerId: 'p3', name: 'Player Three', metricValue: 78 }
  ];

  test('restricts assistant coach metrics to assigned roster players', () => {
    const assistant: AssistantCoach = {
      uid: 'ast1',
      role: 'assistant_coach',
      assignedRosterPlayerIds: ['p1']
    };

    const scoped = scopePlayerMetricsForStaff(assistant, allMetrics);

    expect(scoped).toHaveLength(1);
    expect(scoped[0].playerId).toBe('p1');
  });

  test('grants full access to head coach', () => {
    const headCoach: AssistantCoach = {
      uid: 'hc1',
      role: 'head_coach',
      assignedRosterPlayerIds: []
    };

    const scoped = scopePlayerMetricsForStaff(headCoach, allMetrics);

    expect(scoped).toHaveLength(3);
  });
});
