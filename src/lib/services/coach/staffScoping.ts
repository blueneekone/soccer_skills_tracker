export interface AssistantCoach {
  uid: string;
  role: 'assistant_coach' | 'head_coach' | 'director';
  assignedRosterPlayerIds: string[];
}

export interface PlayerMetric {
  playerId: string;
  name: string;
  metricValue: number;
}

export function scopePlayerMetricsForStaff(
  user: AssistantCoach,
  allMetrics: PlayerMetric[]
): PlayerMetric[] {
  if (user.role === 'head_coach' || user.role === 'director') {
    return allMetrics;
  }
  return allMetrics.filter((m) => user.assignedRosterPlayerIds.includes(m.playerId));
}
