<script lang="ts">
	/**
	 * TutorDashboard.svelte — Scholar Academic Command Portal
	 * ────────────────────────────────────────────────────────
	 * High-density academic progress dashboard for users with the `tutor` role.
	 *
	 * PANELS
	 * ──────
	 * ROSTER OVERVIEW  — aggregate GPA, eligibility counts, scholar count
	 * STUDENT CARDS    — per-student academic record with eligibility badge,
	 *                    GPA trend indicator, study hours, and subject breakdown
	 * EDIT PANEL       — slide-in form for tutors to update a student's record
	 *
	 * ZERO-TRUST GATE
	 * ───────────────
	 * Only `tutor`, `director`, `global_admin`, `super_admin` roles can
	 * render this component. Firestore rules enforce the same constraint.
	 */

	import { onMount, onDestroy } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte.js';
	import { TutorRosterEngine, ScholarEngine, computeEligibility, type EligibilityStatus, type AcademicRecord } from '$lib/services/scholar.svelte.js';

	// ── State ─────────────────────────────────────────────────────────────────

	const roster = new TutorRosterEngine();
	let selectedEmail = $state<string | null>(null);
	let editOpen = $state(false);
	let editGpa = $state('');
	let editStudyHours = $state('');
	let editSaving = $state(false);
	let editError = $state('');

	// ── Derived ───────────────────────────────────────────────────────────────

	const tutorEmail = $derived(authStore.user?.email ?? '');
	const role = $derived(authStore.role ?? '');
	const canAccess = $derived(
		role === 'tutor' || role === 'director' || role === 'global_admin' || role === 'super_admin',
	);

	const selectedEngine = $derived(
		roster.engines.find((e) => e.record?.playerEmail === selectedEmail) ?? null,
	);

	function eligLabel(status: EligibilityStatus): string {
		switch (status) {
			case 'eligible':   return 'ELIGIBLE';
			case 'probation':  return 'PROBATION';
			case 'ineligible': return 'INELIGIBLE';
			default:           return 'UNKNOWN';
		}
	}
	function eligColor(status: EligibilityStatus): string {
		switch (status) {
			case 'eligible':   return '#14b8a6';
			case 'probation':  return '#f59e0b';
			case 'ineligible': return '#ff003c';
			default:           return '#64748b';
		}
	}
	function trendIcon(trend: 'up' | 'down' | 'stable'): string {
		return trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
	}
	function trendColor(trend: 'up' | 'down' | 'stable'): string {
		return trend === 'up' ? '#14b8a6' : trend === 'down' ? '#ff003c' : '#64748b';
	}

	function openEdit(email: string, record: AcademicRecord | null): void {
		selectedEmail = email;
		editGpa = record ? record.gpa.toFixed(2) : '';
		editStudyHours = record ? String(record.studyHoursWeek) : '';
		editError = '';
		editOpen = true;
	}
	function closeEdit(): void {
		editOpen = false;
		selectedEmail = null;
	}
	async function saveEdit(): Promise<void> {
		if (!selectedEngine || !selectedEmail) return;
		const gpa = parseFloat(editGpa);
		const hours = parseFloat(editStudyHours);
		if (!isFinite(gpa) || gpa < 0 || gpa > 4.0) {
			editError = 'GPA must be between 0.0 and 4.0.';
			return;
		}
		editSaving = true;
		editError = '';
		try {
			await selectedEngine.saveRecord({ gpa, studyHoursWeek: isFinite(hours) ? hours : 0 });
			closeEdit();
		} catch (err: unknown) {
			editError = err instanceof Error ? err.message : 'Save failed.';
		} finally {
			editSaving = false;
		}
	}

	onMount(() => {
		if (tutorEmail && canAccess) roster.init(tutorEmail);
	});
	onDestroy(() => roster.destroy());

	function handleKeydown(ev: KeyboardEvent): void {
		if (ev.key === 'Escape' && editOpen) closeEdit();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if !canAccess}
	<div class="td-locked">
		<span class="td-locked__icon" aria-hidden="true">⛔</span>
		<h2>TUTOR CLEARANCE REQUIRED</h2>
		<p>Academic records are restricted to verified tutors and directors.</p>
	</div>
{:else}
	<div class="td-root">
		<!-- ── HEADER ──────────────────────────────────────────────────────────── -->
		<header class="td-header">
			<div class="td-header__brand">
				<span class="td-header__icon" aria-hidden="true">🎓</span>
				<span class="td-header__title">SCHOLAR COMMAND</span>
				<span class="td-header__sub">Academic Oversight Portal · {role.toUpperCase()}</span>
			</div>
		</header>

		<!-- ── AGGREGATE METRICS ──────────────────────────────────────────────── -->
		<div class="td-kpis">
			<div class="td-kpi">
				<span class="td-kpi__val">{roster.engines.length}</span>
				<span class="td-kpi__label">STUDENTS</span>
			</div>
			<div class="td-kpi">
				<span class="td-kpi__val td-kpi__val--cyan">{roster.avgGpa.toFixed(2)}</span>
				<span class="td-kpi__label">AVG GPA</span>
			</div>
			<div class="td-kpi">
				<span class="td-kpi__val" style:color="#14b8a6">{roster.eligibleCount}</span>
				<span class="td-kpi__label">ELIGIBLE</span>
			</div>
			<div class="td-kpi">
				<span class="td-kpi__val" style:color="#f59e0b">{roster.probationCount}</span>
				<span class="td-kpi__label">PROBATION</span>
			</div>
			<div class="td-kpi">
				<span class="td-kpi__val" style:color="#ff003c">{roster.ineligibleCount}</span>
				<span class="td-kpi__label">INELIGIBLE</span>
			</div>
			<div class="td-kpi">
				<span class="td-kpi__val" style:color="#fbbf24">{roster.scholarsCount}</span>
				<span class="td-kpi__label">🎓 SCHOLARS</span>
			</div>
		</div>

		<!-- ── STUDENT GRID ───────────────────────────────────────────────────── -->
		{#if roster.loading}
			<div class="td-loading">
				<span class="td-spinner" aria-label="Loading assignments"></span>
				<span>LOADING ASSIGNED STUDENTS…</span>
			</div>
		{:else if roster.engines.length === 0}
			<div class="td-empty">
				<span>NO STUDENTS ASSIGNED</span>
				<span class="td-empty__sub">Contact a Director to assign students to your tutor account.</span>
			</div>
		{:else}
			<div class="td-grid">
				{#each roster.engines as engine, i (roster.studentEmails[i])}
					<div
						class="td-card"
						class:td-card--probation={engine.eligibility === 'probation'}
						class:td-card--ineligible={engine.eligibility === 'ineligible'}
						class:td-card--scholar={engine.hasScholarBadge}
					>
						{#if engine.hasScholarBadge}
							<div class="td-card__scholar-glow" aria-hidden="true"></div>
						{/if}

						<!-- Card header: name + eligibility badge -->
						<div class="td-card__head">
							<div class="td-card__name-block">
								<span class="td-card__name">
									{engine.record?.playerName?.toUpperCase() ?? roster.studentEmails[i].split('@')[0].toUpperCase()}
								</span>
								<span class="td-card__email">{roster.studentEmails[i]}</span>
							</div>
							<div class="td-card__elig-badge" style:background="color-mix(in srgb, {eligColor(engine.eligibility)} 12%, transparent)" style:color={eligColor(engine.eligibility)} style:border-color="color-mix(in srgb, {eligColor(engine.eligibility)} 35%, transparent)">
								{eligLabel(engine.eligibility)}
							</div>
						</div>

						<!-- GPA + Scholar Badge + Study Hours -->
						<div class="td-card__metrics">
							<div class="td-card__gpa">
								<span class="td-card__gpa-val" style:color={engine.hasScholarBadge ? '#fbbf24' : eligColor(engine.eligibility)}>
									{engine.gpaLabel}
									{#if engine.hasScholarBadge}<span class="td-card__scholar-icon">🎓</span>{/if}
								</span>
								<span
									class="td-card__trend"
									style:color={trendColor(engine.trend)}
									title="GPA trend: {engine.trend}"
								>
									{trendIcon(engine.trend)}
								</span>
								<span class="td-card__gpa-label">GPA</span>
							</div>
							<div class="td-card__hours">
								<span class="td-card__hours-val">{engine.studyHours}</span>
								<span class="td-card__hours-label">HRS/WK</span>
							</div>
						</div>

						<!-- GPA bar (0–4.0 scale) -->
						<div class="td-card__gpa-bar-wrap" aria-label="GPA progress {engine.gpaLabel} / 4.0">
							<div
								class="td-card__gpa-bar"
								style:width="{(engine.gpa / 4.0) * 100}%"
								style:background={engine.hasScholarBadge ? '#fbbf24' : eligColor(engine.eligibility)}
							></div>
						</div>
						<div class="td-card__bar-labels">
							<span>0.0</span><span>4.0</span>
						</div>

						<!-- Subjects (if loaded) -->
						{#if engine.record?.subjects?.length}
							<div class="td-card__subjects">
								{#each engine.record.subjects.slice(0, 4) as subj}
									<div class="td-card__subj">
										<span class="td-card__subj-name">{subj.name}</span>
										<span class="td-card__subj-grade" class:td-card__subj-grade--warn={subj.gradePoints < 2.0}>{subj.grade}</span>
									</div>
								{/each}
							</div>
						{/if}

						<!-- Actions -->
						<div class="td-card__actions">
							<button
								class="td-card__btn"
								onclick={() => openEdit(roster.studentEmails[i], engine.record)}
							>
								EDIT RECORD
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}

<!-- ── EDIT SLIDE-IN ─────────────────────────────────────────────────────────── -->
{#if editOpen && selectedEmail}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="td-edit-backdrop" onclick={closeEdit}></div>
	<aside class="td-edit-panel" aria-label="Edit academic record for {selectedEmail}">
		<header class="td-edit-panel__header">
			<h2 class="td-edit-panel__title">EDIT RECORD</h2>
			<p class="td-edit-panel__sub">{selectedEmail}</p>
			<button class="td-edit-panel__close" onclick={closeEdit} aria-label="Close">✕</button>
		</header>

		<form class="td-edit-form" onsubmit={(e) => { e.preventDefault(); saveEdit(); }}>
			<div class="td-edit-form__field">
				<label class="td-edit-form__label" for="edit-gpa">CUMULATIVE GPA</label>
				<input
					id="edit-gpa"
					type="number"
					class="td-edit-form__input"
					min="0"
					max="4.0"
					step="0.01"
					placeholder="3.50"
					bind:value={editGpa}
					required
				/>
				{#if editGpa}
					{@const parsed = parseFloat(editGpa)}
					{@const elig = isFinite(parsed) ? computeEligibility(parsed) : 'unknown'}
					<span class="td-edit-form__elig-preview" style:color={eligColor(elig)}>
						→ {eligLabel(elig)} {parsed >= 3.5 ? '🎓' : ''}
					</span>
				{/if}
			</div>

			<div class="td-edit-form__field">
				<label class="td-edit-form__label" for="edit-hours">WEEKLY STUDY HOURS</label>
				<input
					id="edit-hours"
					type="number"
					class="td-edit-form__input"
					min="0"
					max="80"
					step="0.5"
					placeholder="12"
					bind:value={editStudyHours}
				/>
			</div>

			{#if editError}
				<p class="td-edit-form__error">{editError}</p>
			{/if}

			<div class="td-edit-form__actions">
				<button type="button" class="td-edit-form__cancel" onclick={closeEdit}>CANCEL</button>
				<button type="submit" class="td-edit-form__save" disabled={editSaving}>
					{editSaving ? 'SAVING…' : 'SAVE RECORD'}
				</button>
			</div>
			<p class="td-edit-form__audit-note">
				This update is logged to the compliance audit trail with your UID and timestamp.
			</p>
		</form>
	</aside>
{/if}

<style>
	/* ── Root ─────────────────────────────────────────────────────────────────── */
	.td-root {
		min-height: 100vh;
		background: #010409;
		color: rgba(226, 232, 240, 0.9);
		font-family: 'JetBrains Mono', monospace;
	}

	/* ── Locked state ─────────────────────────────────────────────────────────── */
	.td-locked {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		gap: 0.75rem;
		font-family: 'JetBrains Mono', monospace;
		text-align: center;
		padding: 2rem;
	}
	.td-locked__icon { font-size: 2rem; }
	.td-locked h2 { margin: 0; font-size: 0.85rem; letter-spacing: 0.2em; color: white; }
	.td-locked p { font-size: 0.65rem; color: rgba(255,255,255,0.35); margin: 0; }

	/* ── Header ──────────────────────────────────────────────────────────────── */
	.td-header {
		padding: 1.1rem 1.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.07);
		background: rgba(1,4,9,0.95);
		backdrop-filter: blur(24px);
		position: sticky;
		top: 0;
		z-index: 20;
	}
	.td-header__brand {
		display: flex;
		align-items: center;
		gap: 0.6rem;
	}
	.td-header__icon { font-size: 1.1rem; }
	.td-header__title {
		font-size: 0.75rem;
		font-weight: 900;
		letter-spacing: 0.25em;
		color: #fbbf24;
	}
	.td-header__sub {
		font-size: 0.5rem;
		letter-spacing: 0.12em;
		color: rgba(255,255,255,0.3);
	}

	/* ── KPI bar ─────────────────────────────────────────────────────────────── */
	.td-kpis {
		display: flex;
		gap: 0;
		border-bottom: 1px solid rgba(255,255,255,0.06);
		flex-wrap: wrap;
	}
	.td-kpi {
		flex: 1;
		min-width: 80px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		padding: 1rem 0.5rem;
		border-right: 1px solid rgba(255,255,255,0.06);
	}
	.td-kpi:last-child { border-right: none; }
	.td-kpi__val {
		font-size: 1.4rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: white;
		line-height: 1;
	}
	.td-kpi__val--cyan { color: #14b8a6; }
	.td-kpi__label {
		font-size: 0.45rem;
		letter-spacing: 0.2em;
		color: rgba(255,255,255,0.3);
		text-align: center;
	}

	/* ── Loading / Empty ─────────────────────────────────────────────────────── */
	.td-loading, .td-empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 3rem 1rem;
		font-size: 0.65rem;
		letter-spacing: 0.1em;
		color: rgba(255,255,255,0.25);
	}
	.td-empty__sub { font-size: 0.55rem; color: rgba(255,255,255,0.18); text-align: center; max-width: 280px; }
	.td-spinner {
		display: inline-block;
		width: 18px;
		height: 18px;
		border: 2px solid rgba(251,191,36,0.2);
		border-top-color: #fbbf24;
		border-radius: 50%;
		animation: td-spin 0.75s linear infinite;
	}

	/* ── Student grid ────────────────────────────────────────────────────────── */
	.td-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 0.75rem;
		padding: 1.25rem 1.5rem;
	}
	@media (max-width: 480px) {
		.td-grid { grid-template-columns: 1fr; padding: 0.75rem; }
	}

	/* ── Student card ────────────────────────────────────────────────────────── */
	.td-card {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.9rem;
		border-radius: 10px;
		border: 1px solid rgba(255,255,255,0.07);
		background: rgba(10,14,22,0.85);
		backdrop-filter: blur(12px);
		overflow: hidden;
		transition: border-color 0.25s;
	}
	.td-card--scholar {
		border-color: rgba(251,191,36,0.25);
		box-shadow: 0 0 20px rgba(251,191,36,0.07);
	}
	.td-card--probation { border-color: rgba(245,158,11,0.2); }
	.td-card--ineligible { border-color: rgba(255,0,60,0.2); }

	.td-card__scholar-glow {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at top right, rgba(251,191,36,0.06) 0%, transparent 60%);
		pointer-events: none;
	}

	.td-card__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.td-card__name-block {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.td-card__name {
		font-size: 0.72rem;
		font-weight: 900;
		letter-spacing: 0.08em;
		color: white;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.td-card__email {
		font-size: 0.48rem;
		color: rgba(255,255,255,0.25);
		letter-spacing: 0.05em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.td-card__elig-badge {
		padding: 2px 7px;
		border-radius: 4px;
		font-size: 0.5rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		border: 1px solid;
		flex-shrink: 0;
	}

	.td-card__metrics {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.td-card__gpa {
		display: flex;
		align-items: baseline;
		gap: 0.3rem;
	}
	.td-card__gpa-val {
		font-size: 1.6rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.td-card__scholar-icon { font-size: 0.85rem; }
	.td-card__trend {
		font-size: 1rem;
		font-weight: 700;
		line-height: 1;
	}
	.td-card__gpa-label {
		font-size: 0.45rem;
		letter-spacing: 0.2em;
		color: rgba(255,255,255,0.3);
		align-self: flex-end;
		margin-bottom: 2px;
	}

	.td-card__hours {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.td-card__hours-val {
		font-size: 1.1rem;
		font-weight: 900;
		font-variant-numeric: tabular-nums;
		color: white;
	}
	.td-card__hours-label {
		font-size: 0.42rem;
		letter-spacing: 0.15em;
		color: rgba(255,255,255,0.3);
	}

	.td-card__gpa-bar-wrap {
		height: 3px;
		background: rgba(255,255,255,0.06);
		border-radius: 2px;
		overflow: hidden;
	}
	.td-card__gpa-bar { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
	.td-card__bar-labels {
		display: flex;
		justify-content: space-between;
		font-size: 0.4rem;
		color: rgba(255,255,255,0.2);
		letter-spacing: 0.08em;
	}

	.td-card__subjects {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}
	.td-card__subj {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 3px 6px;
		border-radius: 4px;
		background: rgba(255,255,255,0.03);
	}
	.td-card__subj-name {
		font-size: 0.55rem;
		color: rgba(255,255,255,0.5);
		letter-spacing: 0.05em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.td-card__subj-grade {
		font-size: 0.65rem;
		font-weight: 800;
		color: rgba(20, 184, 166,0.8);
		flex-shrink: 0;
	}
	.td-card__subj-grade--warn { color: rgba(245,158,11,0.9); }

	.td-card__actions {
		display: flex;
		gap: 0.4rem;
		margin-top: auto;
	}
	.td-card__btn {
		flex: 1;
		padding: 0.4rem;
		border-radius: 6px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.03);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.5rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		min-height: 36px;
		transition: color 0.2s, border-color 0.2s;
	}
	.td-card__btn:hover { color: #fbbf24; border-color: rgba(251,191,36,0.35); }

	/* ── Edit panel ──────────────────────────────────────────────────────────── */
	.td-edit-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.55);
		backdrop-filter: blur(4px);
		z-index: 200;
	}
	.td-edit-panel {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		width: min(400px, 96vw);
		background: rgba(8,12,22,0.98);
		border-left: 1px solid rgba(255,255,255,0.08);
		box-shadow: -20px 0 60px rgba(0,0,0,0.5);
		z-index: 201;
		display: flex;
		flex-direction: column;
		animation: td-slide-in 0.22s ease-out;
	}
	@media (max-width: 400px) { .td-edit-panel { width: 100vw; border-left: none; } }

	.td-edit-panel__header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.07);
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		position: relative;
	}
	.td-edit-panel__title {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 900;
		letter-spacing: 0.2em;
		color: #fbbf24;
	}
	.td-edit-panel__sub {
		margin: 3px 0 0;
		font-size: 0.55rem;
		color: rgba(255,255,255,0.3);
		letter-spacing: 0.05em;
	}
	.td-edit-panel__close {
		padding: 5px 9px;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(255,255,255,0.08);
		border-radius: 5px;
		color: rgba(255,255,255,0.4);
		cursor: pointer;
		font-size: 0.65rem;
		min-height: 32px;
	}
	.td-edit-panel__close:hover { color: white; }

	.td-edit-form {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
		flex: 1;
	}
	.td-edit-form__field {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}
	.td-edit-form__label {
		font-size: 0.55rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		color: rgba(255,255,255,0.4);
	}
	.td-edit-form__input {
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.12);
		border-radius: 6px;
		padding: 0.55rem 0.8rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.85rem;
		font-variant-numeric: tabular-nums;
		color: white;
		outline: none;
		transition: border-color 0.2s;
	}
	.td-edit-form__input:focus { border-color: rgba(251,191,36,0.5); }
	.td-edit-form__elig-preview {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		margin-top: 2px;
	}
	.td-edit-form__error {
		margin: 0;
		padding: 0.4rem 0.7rem;
		border-radius: 5px;
		background: rgba(255,0,60,0.07);
		border: 1px solid rgba(255,0,60,0.2);
		font-size: 0.6rem;
		color: rgba(255,80,100,0.9);
	}
	.td-edit-form__actions {
		display: flex;
		gap: 0.6rem;
		margin-top: auto;
	}
	.td-edit-form__cancel {
		flex: 1;
		padding: 0.6rem;
		border-radius: 7px;
		border: 1px solid rgba(255,255,255,0.1);
		background: rgba(255,255,255,0.03);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		color: rgba(255,255,255,0.35);
		cursor: pointer;
		min-height: 44px;
	}
	.td-edit-form__save {
		flex: 2;
		padding: 0.6rem;
		border-radius: 7px;
		border: 1px solid rgba(251,191,36,0.4);
		background: rgba(251,191,36,0.08);
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		color: #fbbf24;
		cursor: pointer;
		transition: background 0.2s;
		min-height: 44px;
	}
	.td-edit-form__save:hover:not(:disabled) { background: rgba(251,191,36,0.14); }
	.td-edit-form__save:disabled { opacity: 0.5; cursor: not-allowed; }
	.td-edit-form__audit-note {
		margin: 0;
		font-size: 0.5rem;
		color: rgba(255,255,255,0.2);
		letter-spacing: 0.05em;
		line-height: 1.5;
	}

	/* ── Keyframes ───────────────────────────────────────────────────────────── */
	@keyframes td-spin {
		from { transform: rotate(0deg); }
		to   { transform: rotate(360deg); }
	}
	@keyframes td-slide-in {
		from { transform: translateX(100%); opacity: 0; }
		to   { transform: translateX(0); opacity: 1; }
	}
</style>
