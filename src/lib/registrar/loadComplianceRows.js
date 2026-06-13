import { db } from '$lib/firebase.js';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { hydrateSensitiveFieldsFromDoc } from '$lib/services/vault.svelte.ts';
import {
	normalizeEligibilityMatrix,
	evaluateClubEligibility,
} from '$lib/director/evaluateClubEligibility.js';

/**
 * @typedef {object} RegistrarRosterRow
 * @property {string} key
 * @property {string} playerName
 * @property {string} teamId
 * @property {string} teamLabel
 * @property {string} statsDocId
 * @property {string | null} email
 * @property {string | null} ageGroup
 * @property {string} dobLabel
 * @property {boolean} guardianLinked
 * @property {string} waiverLabel
 * @property {'ok' | 'bad' | 'warn' | 'muted'} waiverKind
 * @property {string} passportLabel
 * @property {'ok' | 'bad' | 'warn' | 'muted'} passportKind
 * @property {boolean} hasSignedWaiver
 * @property {string | null} clearanceStatus
 * @property {string | null} emergencyName
 * @property {string | null} emergencyPhone
 * @property {string | null} medicalNotes
 * @property {boolean | null} eligible
 * @property {string[]} blockers
 * @property {string | null} vpcStatus
 */

/**
 * @param {string} teamName
 */
function parseAgeFromTeamName(teamName) {
	if (!teamName) return null;
	const m = String(teamName).match(/\bU\s*(\d{1,2})\b/i);
	return m ? `U${m[1]}` : null;
}

/**
 * @param {string} name
 * @param {Record<string, Record<string, unknown>>} ps
 */
function resolveStatsDocId(name, ps) {
	if (ps[name]) return name;
	const id = Object.keys(ps).find((k) => ps[k]?.playerName === name);
	return id || name;
}

/**
 * @param {unknown} v
 */
function formatDocDate(v) {
	if (v == null || v === '') return '—';
	if (typeof v === 'object' && v !== null && 'toDate' in v && typeof v.toDate === 'function') {
		try {
			return v.toDate().toLocaleDateString();
		} catch {
			return '—';
		}
	}
	if (typeof v === 'string') {
		const d = Date.parse(v);
		return Number.isNaN(d) ? '—' : new Date(d).toLocaleDateString();
	}
	return '—';
}

/**
 * @param {Record<string, unknown> | null} passportData
 */
function passportCell(passportData) {
	if (!passportData) return { label: 'Not on file', kind: /** @type {const} */ ('muted') };
	const cs = /** @type {string} */ (passportData.clearanceStatus || 'CLEARED');
	if (cs === 'RED_CARD') return { label: 'Expired', kind: /** @type {const} */ ('bad') };
	if (cs === 'PENDING_SAFESPORT') return { label: 'Pending', kind: /** @type {const} */ ('warn') };
	return { label: 'Verified', kind: /** @type {const} */ ('ok') };
}

/**
 * @param {Record<string, unknown> | null} passportData
 */
function waiverCell(passportData) {
	if (!passportData) return { label: '—', kind: /** @type {const} */ ('muted') };
	if (passportData.hasSignedWaiver === true) return { label: 'Signed', kind: /** @type {const} */ ('ok') };
	return { label: 'Missing', kind: /** @type {const} */ ('bad') };
}

/**
 * @param {string[]} emails
 */
async function fetchPassportUserCache(emails) {
	/** @type {Record<string, Record<string, unknown>>} */
	const passports = {};
	/** @type {Record<string, Record<string, unknown>>} */
	const users = {};
	await Promise.all(
		emails.map(async (em) => {
			const [p, u] = await Promise.all([
				getDoc(doc(db, 'passports', em)),
				getDoc(doc(db, 'users', em)),
			]);
			if (p.exists()) passports[em] = p.data();
			if (u.exists()) users[em] = u.data();
		}),
	);
	return { passports, users };
}

/**
 * @param {Array<{ id: string, name?: string }>} teams
 * @param {Record<string, boolean> | null | undefined} [matrixRaw]
 * @returns {Promise<RegistrarRosterRow[]>}
 */
export async function loadComplianceTable(teams, matrixRaw) {
	const matrix = normalizeEligibilityMatrix(matrixRaw);
	/** @type {RegistrarRosterRow[]} */
	const out = [];
	for (const t of teams) {
		const teamId = t.id;
		const teamLabel = (typeof t.name === 'string' && t.name.trim()) || teamId;
		const ageGroup = parseAgeFromTeamName(teamLabel);
		const [statsSnap, rosterSnap, linkSnap] = await Promise.all([
			getDocs(query(collection(db, 'player_stats'), where('teamId', '==', teamId))),
			getDoc(doc(db, 'rosters', teamId)),
			getDocs(query(collection(db, 'player_lookup'), where('teamId', '==', teamId))),
		]);

		/** @type {Record<string, Record<string, unknown>>} */
		const playerStats = {};
		statsSnap.forEach((d) => {
			playerStats[d.id] = d.data();
		});

		/** @type {Record<string, string>} */
		const nameToEmail = {};
		linkSnap.forEach((d) => {
			const data = d.data();
			if (typeof data.playerName === 'string' && data.playerName.trim()) {
				nameToEmail[data.playerName.trim()] = d.id;
			}
		});

		const rosterList = rosterSnap.exists() ? rosterSnap.data().players || [] : [];
		const combined = new Set([...rosterList, ...Object.keys(playerStats)]);
		const sorted = Array.from(combined).sort((a, b) => a.localeCompare(b));

		const emails = [...new Set(Object.values(nameToEmail))];
		const cache = await fetchPassportUserCache(emails);

		for (const playerName of sorted) {
			const em = nameToEmail[playerName] || null;
			const statsId = resolveStatsDocId(playerName, playerStats);
			const passportRaw = em ? cache.passports[em] ?? null : null;
			const passportData =
				passportRaw && typeof passportRaw === 'object' ? passportRaw : null;
			const pii =
				passportData ?
					await hydrateSensitiveFieldsFromDoc(passportData, [
						'emergencyName',
						'emergencyPhone',
						'medicalNotes',
					])
				:	{};
			const userData = em ? cache.users[em] ?? null : null;
			const isMinor = userData?.isMinor === true;
			const vpcStatus =
				typeof userData?.vpcStatus === 'string' ? userData.vpcStatus : null;
			const dobRaw = passportData?.dateOfBirth ?? userData?.dateOfBirth ?? null;
			const pc = passportCell(passportData);
			const wc = waiverCell(passportData);
			const eligibility = evaluateClubEligibility(
				{
					hasSignedWaiver: passportData?.hasSignedWaiver === true,
					passportKind: pc.kind,
					guardianLinked: Boolean(em),
					clearanceStatus:
						typeof passportData?.clearanceStatus === 'string' ?
							passportData.clearanceStatus
						:	null,
					isMinor,
					vpcStatus,
				},
				matrix,
			);
			out.push({
				key: `${teamId}::${playerName}`,
				playerName,
				teamId,
				teamLabel,
				statsDocId: statsId,
				email: em,
				ageGroup,
				dobLabel: formatDocDate(dobRaw),
				guardianLinked: Boolean(em),
				waiverLabel: wc.label,
				waiverKind: wc.kind,
				passportLabel: pc.label,
				passportKind: pc.kind,
				hasSignedWaiver: passportData?.hasSignedWaiver === true,
				clearanceStatus:
					typeof passportData?.clearanceStatus === 'string' ?
						passportData.clearanceStatus
					:	null,
				emergencyName: pii.emergencyName ?? null,
				emergencyPhone: pii.emergencyPhone ?? null,
				medicalNotes: pii.medicalNotes ?? null,
				eligible: eligibility.eligible,
				blockers: eligibility.blockers,
				vpcStatus,
			});
		}
	}
	out.sort((a, b) => {
		const c = a.teamLabel.localeCompare(b.teamLabel);
		if (c !== 0) return c;
		return a.playerName.localeCompare(b.playerName);
	});
	return out;
}
