import { getFunctions, httpsCallable } from 'firebase/functions';

export function createAnalyticsEngine(clubId: string) {
	let isDispatching = $state(false);
	const complianceHealth = $state({ safeSport: 98, vpc: 98 });
	const telemetry = $state({
		engagement: [65, 72, 85, 91, 95, 98],
		seats: { active: 320, inactive: 45, pending: 12 }
	});
	let error = $state<string | null>(null);

	async function dispatchReportCards() {
		isDispatching = true;
		error = null;
		
		try {
			const functions = getFunctions();
			const triggerDispatch = httpsCallable(functions, 'batchDispatchReportCards');
			
			const result = await triggerDispatch({ clubId });
			console.log('[AnalyticsEngine] Dispatch queued successfully', result);
			
		} catch (e: any) {
			console.error('[AnalyticsEngine] Dispatch failed:', e);
			error = e.message || 'Failed to trigger batch dispatch';
		} finally {
			isDispatching = false;
		}
	}

	return {
		get isDispatching() { return isDispatching; },
		get complianceHealth() { return complianceHealth; },
		get telemetry() { return telemetry; },
		get error() { return error; },
		dispatchReportCards
	};
}
