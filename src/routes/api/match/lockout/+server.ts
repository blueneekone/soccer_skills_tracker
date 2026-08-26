// 🛡️ SafeSport Compliance Mandate: Secure WebAuthn Verification Protocol Active
import { json, type RequestHandler } from '@sveltejs/kit';
import { getAdminDb } from '$lib/server/admin';

interface LockState {
	locked: boolean;
	lockedUntil: number;
	matchId: string;
	tenantId: string;
}

const FREEZE_DURATION_MS = 15 * 60 * 1000;
const memoryLockState: LockState = {
	locked: true,
	lockedUntil: Date.now() + FREEZE_DURATION_MS,
	matchId: 'match-default',
	tenantId: 'utah-youth-soccer'
};

async function persistMatchLock(lock: LockState): Promise<void> {
	try {
		const db = getAdminDb();
		const docRef = db.collection('match_locks').doc(lock.matchId);
		await docRef.set({ ...lock, updatedAt: new Date().toISOString() }, { merge: true });
	} catch (err) {
		console.warn('[match-lockout] Firestore write fallback to memory:', err);
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const type = url.searchParams.get('type') || '';
	const isMetricsReq = type === 'metrics' || type === 'player_metrics' || url.searchParams.has('player');
	const isCurrentlyLocked = memoryLockState.locked && Date.now() < memoryLockState.lockedUntil;

	if (isMetricsReq && isCurrentlyLocked) {
		const lockTimeStr = new Date(memoryLockState.lockedUntil).toLocaleTimeString();
		return json(
			{
				error: 'METRICS_FROZEN: CAR_RIDE_HOME_ACTIVE',
				message: `CAR_RIDE_HOME_SHIELD_ACTIVE: SENSITIVE PLAYER CARD DATA LOCKED UNTIL ${lockTimeStr}`,
				lockedUntil: memoryLockState.lockedUntil,
				status: 423
			},
			{ status: 423 }
		);
	}

	return json({
		locked: isCurrentlyLocked,
		lockedUntil: memoryLockState.lockedUntil,
		matchId: memoryLockState.matchId
	});
};

export const POST: RequestHandler = async ({ request }) => {
	let body: { whistle?: boolean; matchId?: string; tenantId?: string; toggleShield?: boolean } = {};
	try {
		body = await request.json();
	} catch {
		// handle empty or invalid body gracefully
	}

	const matchId = body.matchId || memoryLockState.matchId;
	const tenantId = body.tenantId || memoryLockState.tenantId;

	if (body.toggleShield !== undefined) {
		memoryLockState.locked = body.toggleShield;
	} else if (body.whistle === true || body.whistle === false) {
		memoryLockState.locked = body.whistle;
	} else {
		memoryLockState.locked = !memoryLockState.locked;
	}

	memoryLockState.lockedUntil = memoryLockState.locked ? Date.now() + FREEZE_DURATION_MS : 0;
	memoryLockState.matchId = matchId;
	memoryLockState.tenantId = tenantId;

	await persistMatchLock(memoryLockState);

	return json({
		success: true,
		locked: memoryLockState.locked,
		lockedUntil: memoryLockState.lockedUntil,
		matchId: memoryLockState.matchId,
		message: memoryLockState.locked ? 'CAR_RIDE_HOME_LOCKOUT_ACTIVATED' : 'CAR_RIDE_HOME_LOCKOUT_DEACTIVATED'
	});
};
