/**
 * scholar.svelte.ts — Scholar Academic Tracking Engine
 * ─────────────────────────────────────────────────────
 * Svelte 5 reactive service for academic progress tracking.
 *
 * ROLE MODEL
 * ──────────
 * • Tutor  — sees academic_records for their assigned students.
 *            Documents are scoped: academic_records/{playerEmail}
 *            Tutor assignment: tutor_assignments/{tutorEmail}.studentEmails[]
 * • Player — reads their own academic_records document.
 * • Coach/Director — read-only aggregate view (eligibility status only, no raw grades).
 *
 * COLLECTIONS
 * ───────────
 * academic_records/{playerEmail}
 *   gpa:            number          (0.0 – 4.0)
 *   studyHoursWeek: number          (hours/week)
 *   eligibilityStatus: 'eligible' | 'probation' | 'ineligible'
 *   subjects:       Subject[]
 *   gpaTrend:       GpaTrendPoint[] (last 8 terms)
 *   updatedAt:      Timestamp
 *   tenantId:       string
 *
 * tutor_assignments/{tutorEmail}
 *   studentEmails: string[]
 *   tenantId:      string
 *
 * ELIGIBILITY THRESHOLDS (NCAA / NFHS standard)
 * ──────────────────────────────────────────────
 *   GPA >= 2.0  → eligible
 *   GPA 1.5–2.0 → academic probation
 *   GPA <  1.5  → ineligible
 */

import { browser } from '$app/environment';
import {
	collection,
	doc,
	getDoc,
	onSnapshot,
	setDoc,
	serverTimestamp,
	query,
	where,
	type Unsubscribe,
} from 'firebase/firestore';
import { db } from '$lib/firebase.js';
import { authStore } from '$lib/stores/auth.svelte.js';

// ── Public types ─────────────────────────────────────────────────────────────

export type EligibilityStatus = 'eligible' | 'probation' | 'ineligible' | 'unknown';

export interface Subject {
	name: string;
	grade: string; // letter grade "A", "B+", etc.
	gradePoints: number; // numeric 0-4
	credits: number;
	semester: string;
}

export interface GpaTrendPoint {
	term: string; // "Fall 2025", "Spring 2026"
	gpa: number;
	studyHours?: number;
}

export interface AcademicRecord {
	playerEmail: string;
	playerName?: string;
	gpa: number;
	studyHoursWeek: number;
	eligibilityStatus: EligibilityStatus;
	subjects: Subject[];
	gpaTrend: GpaTrendPoint[];
	updatedAt: Date | null;
	tenantId: string;
}

// ── Eligibility helper ────────────────────────────────────────────────────────

export function computeEligibility(gpa: number): EligibilityStatus {
	if (!isFinite(gpa) || gpa < 0) return 'unknown';
	if (gpa >= 2.0) return 'eligible';
	if (gpa >= 1.5) return 'probation';
	return 'ineligible';
}

// ── GPA change helper ─────────────────────────────────────────────────────────

export function gpaTrend(points: GpaTrendPoint[]): 'up' | 'down' | 'stable' {
	if (points.length < 2) return 'stable';
	const last = points[points.length - 1].gpa;
	const prev = points[points.length - 2].gpa;
	const delta = last - prev;
	if (delta > 0.05) return 'up';
	if (delta < -0.05) return 'down';
	return 'stable';
}

// ═══════════════════════════════════════════════════════════════════════════
// ScholarEngine — single student
// ═══════════════════════════════════════════════════════════════════════════

export class ScholarEngine {
	record = $state<AcademicRecord | null>(null);
	loading = $state(false);
	error = $state('');

	private _playerEmail: string;
	private _unsub: Unsubscribe | null = null;

	// ── Derived ────────────────────────────────────────────────────────────
	readonly gpa = $derived(this.record?.gpa ?? 0);
	readonly studyHours = $derived(this.record?.studyHoursWeek ?? 0);
	readonly eligibility = $derived<EligibilityStatus>(
		this.record ? computeEligibility(this.record.gpa) : 'unknown',
	);
	/** True when GPA >= 3.5 — activates the Scholar Badge on VanguardCard. */
	readonly hasScholarBadge = $derived(this.gpa >= 3.5);
	readonly trend = $derived(gpaTrend(this.record?.gpaTrend ?? []));
	/** Formatted GPA string: "3.75". Returns "—" until loaded. */
	readonly gpaLabel = $derived(
		this.record ? this.record.gpa.toFixed(2) : '—',
	);

	constructor(playerEmail: string) {
		this._playerEmail = playerEmail.trim().toLowerCase();
	}

	subscribe(): void {
		if (!browser || !this._playerEmail) return;
		this._unsub?.();
		this.loading = true;

		const ref = doc(db, 'academic_records', this._playerEmail);
		this._unsub = onSnapshot(
			ref,
			(snap) => {
				if (snap.exists()) {
					const d = snap.data() as Omit<AcademicRecord, 'playerEmail' | 'updatedAt'> & {
						updatedAt?: { toDate(): Date };
					};
					this.record = {
						playerEmail: this._playerEmail,
						playerName: d.playerName,
						gpa: Number(d.gpa ?? 0),
						studyHoursWeek: Number(d.studyHoursWeek ?? 0),
						eligibilityStatus: computeEligibility(Number(d.gpa ?? 0)),
						subjects: Array.isArray(d.subjects) ? d.subjects : [],
						gpaTrend: Array.isArray(d.gpaTrend) ? d.gpaTrend : [],
						updatedAt: d.updatedAt?.toDate() ?? null,
						tenantId: typeof d.tenantId === 'string' ? d.tenantId : '',
					};
				} else {
					this.record = null;
				}
				this.loading = false;
			},
			(err) => {
				this.error = err.message;
				this.loading = false;
			},
		);
	}

	unsubscribe(): void {
		this._unsub?.();
		this._unsub = null;
	}

	/**
	 * Save / update an academic record (tutor/admin only; Firestore rules enforce role).
	 */
	async saveRecord(data: Partial<Omit<AcademicRecord, 'playerEmail' | 'updatedAt'>>): Promise<void> {
		const ref = doc(db, 'academic_records', this._playerEmail);
		const gpa = typeof data.gpa === 'number' ? data.gpa : this.gpa;
		await setDoc(
			ref,
			{
				...data,
				playerEmail: this._playerEmail,
				eligibilityStatus: computeEligibility(gpa),
				tenantId: authStore.tenantId,
				updatedAt: serverTimestamp(),
			},
			{ merge: true },
		);
	}
}

// ═══════════════════════════════════════════════════════════════════════════
// TutorRoster — manages all assigned students for a tutor
// ═══════════════════════════════════════════════════════════════════════════

export class TutorRosterEngine {
	studentEmails = $state<string[]>([]);
	engines = $state<ScholarEngine[]>([]);
	loading = $state(false);
	error = $state('');

	private _tutorEmail: string = '';
	private _unsub: Unsubscribe | null = null;

	// ── Derived aggregates ─────────────────────────────────────────────────
	readonly avgGpa = $derived.by(() => {
		const loaded = this.engines.filter((e) => e.record !== null);
		if (!loaded.length) return 0;
		return loaded.reduce((s, e) => s + e.gpa, 0) / loaded.length;
	});

	readonly eligibleCount = $derived(
		this.engines.filter((e) => e.eligibility === 'eligible').length,
	);
	readonly probationCount = $derived(
		this.engines.filter((e) => e.eligibility === 'probation').length,
	);
	readonly ineligibleCount = $derived(
		this.engines.filter((e) => e.eligibility === 'ineligible').length,
	);
	readonly scholarsCount = $derived(
		this.engines.filter((e) => e.hasScholarBadge).length,
	);

	init(tutorEmail: string): void {
		if (!browser || !tutorEmail) return;
		this._tutorEmail = tutorEmail.trim().toLowerCase();
		this._loadAssignments();
	}

	private async _loadAssignments(): Promise<void> {
		this.loading = true;
		this.error = '';
		try {
			const ref = doc(db, 'tutor_assignments', this._tutorEmail);
			const snap = await getDoc(ref);
			if (snap.exists()) {
				const emails: string[] = snap.data().studentEmails ?? [];
				this.studentEmails = emails;
				// Destroy old engines
				for (const e of this.engines) e.unsubscribe();
				const newEngines = emails.map((email) => {
					const eng = new ScholarEngine(email);
					eng.subscribe();
					return eng;
				});
				this.engines = newEngines;
			} else {
				this.studentEmails = [];
				this.engines = [];
			}
		} catch (err: unknown) {
			this.error = err instanceof Error ? err.message : 'Failed to load assignments.';
		} finally {
			this.loading = false;
		}
	}

	destroy(): void {
		this._unsub?.();
		for (const e of this.engines) e.unsubscribe();
		this._unsub = null;
	}
}
