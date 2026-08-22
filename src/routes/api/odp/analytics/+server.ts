import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export interface OdpAggregatedMetrics {
  region: string;
  totalActiveClubs: number;
  totalPlayers: number;
  averageSprintSpeed: number;
  averageTechnicalScore: number;
}

export const GET: RequestHandler = async ({ request, locals }) => {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.includes('Bearer odp-auth-token')) {
    return json({ error: 'UNAUTHORIZED_ODP_ACCESS' }, { status: 401 });
  }

  // Anonymized B2B state-wide aggregate (PII stripped)
  const odpData: OdpAggregatedMetrics = {
    region: 'STATE_WIDE_ALL_REGIONS',
    totalActiveClubs: 42,
    totalPlayers: 1850,
    averageSprintSpeed: 24.8,
    averageTechnicalScore: 88.5
  };

  return json({
    success: true,
    data: odpData
  });
};
