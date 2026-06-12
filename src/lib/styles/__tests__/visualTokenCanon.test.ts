import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DOSSIER_CSS = join(process.cwd(), 'src/lib/styles/player-dossier.css');

describe('VS-0a — CDO token alias manifest', () => {
	const src = readFileSync(DOSSIER_CSS, 'utf8');

	it('defines canonical CDO alias tokens on player-dossier-root', () => {
		for (const token of [
			'--pd-void-base',
			'--pd-action-gold',
			'--pd-data-cyan',
			'--pd-nav-cyan',
			'--pd-atom-amber',
			'--pd-grey-trim',
			'--pd-chamfer-sm',
			'--pd-chamfer-md',
			'--pd-chamfer-lg',
			'--pd-scrim-void',
		]) {
			expect(src).toContain(token);
		}
	});

	it('aliases gold and data cyan to existing accent tokens', () => {
		expect(src).toMatch(/--pd-action-gold:\s*var\(--pd-accent-action\)/);
		expect(src).toMatch(/--pd-data-cyan:\s*var\(--pd-accent-data\)/);
	});

	it('does not clip-path the entire dossier root (chamfer is per-control only)', () => {
		const rootBlock = src.slice(src.indexOf('.player-dossier-root,'), src.indexOf('/* Sprint 2.16'));
		expect(rootBlock).not.toMatch(/clip-path:\s*polygon/);
	});
});

describe('VS-0b — Coach OS token skin manifest', () => {
	const coachCss = readFileSync(join(process.cwd(), 'src/lib/styles/coach-os.css'), 'utf8');
	const coachLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/coach/+layout.svelte'),
		'utf8',
	);

	it('defines coach-scoped PD tokens and vanguard bridge', () => {
		expect(coachCss).toContain('.coach-os-root');
		expect(coachCss).toMatch(/--pd-data-cyan:\s*#14b8a6/);
		expect(coachCss).toMatch(/--vanguard-accent-primary:\s*var\(--pd-data-cyan\)/);
		expect(coachCss).toMatch(/--pd-chamfer-sm:\s*4px/);
	});

	it('coach routes wrap content in coach-os-root', () => {
		expect(coachLayout).toContain('coach-os-root');
		expect(coachLayout).toContain("coach-os.css");
	});

	it('does not define pd-action-gold on coach root', () => {
		expect(coachCss).not.toMatch(/--pd-action-gold/);
	});
});

describe('VS-3a — Coach shell dashboard', () => {
	const shellCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/coach-shell-dashboard.css'),
		'utf8',
	);
	const coachLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/coach/+layout.svelte'),
		'utf8',
	);
	const coachPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/coach/+page.svelte'),
		'utf8',
	);

	it('coach-shell-dashboard.css defines SIEM Z-layer contract', () => {
		expect(shellCss).toContain('.coach-nexus-canvas');
		expect(shellCss).toContain('.coach-os-panel');
		expect(shellCss).toMatch(/--coach-bento-gap:\s*4px/);
		expect(shellCss).toMatch(/--pd-chamfer-md:\s*8px/);
		expect(shellCss).not.toMatch(/#fbbf24|--pd-action-gold/);
		expect(shellCss).not.toMatch(/backdrop-filter:\s*blur/);
	});

	it('coach layout imports shell dashboard skin', () => {
		expect(coachLayout).toContain('coach-shell-dashboard.css');
	});

	it('coach dashboard uses coach-os panel classes and bento grid', () => {
		expect(coachPage).toMatch(/coach-os-war-room/);
		expect(coachPage).toMatch(/coach-os-facility/);
		expect(coachPage).toMatch(/bento-grid--12col bento-grid--liquid/);
		expect(coachPage).not.toMatch(/#a855f7/);
		expect(coachPage).not.toMatch(/vanguard-surface--hero-liquid/);
	});
});

describe('VS-3b — Coach tactics stratagem', () => {
	const stratagemCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/coach-tactics-stratagem.css'),
		'utf8',
	);
	const tacticalPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/coach/tactical/+page.svelte'),
		'utf8',
	);
	const tacticalDock = readFileSync(
		join(process.cwd(), 'src/lib/components/coach/tactical/hud/TacticalDock.svelte'),
		'utf8',
	);
	const commandDrawer = readFileSync(
		join(process.cwd(), 'src/lib/components/coach/tactical/hud/CommandDrawer.svelte'),
		'utf8',
	);
	const gridPitch = readFileSync(
		join(process.cwd(), 'src/lib/components/coach/grid/GridPitch.svelte'),
		'utf8',
	);
	const gridRoute = readFileSync(
		join(process.cwd(), 'src/lib/components/coach/grid/GridRoute.svelte'),
		'utf8',
	);

	it('coach-tactics-stratagem.css defines Z-layer SIEM contract', () => {
		expect(stratagemCss).toContain('.coach-tactics-shell');
		expect(stratagemCss).toContain('.coach-tac-z1-well');
		expect(stratagemCss).toContain('.coach-tac-z2-drawer');
		expect(stratagemCss).toContain('.coach-tac-z3-pitch');
		expect(stratagemCss).toContain('.coach-tac-z4-btn--deploy');
		expect(stratagemCss).toMatch(/--pd-chamfer-md:\s*8px/);
		expect(stratagemCss).not.toMatch(/#fbbf24|--pd-action-gold/);
		expect(stratagemCss).not.toMatch(/backdrop-filter:\s*blur/);
		expect(stratagemCss).not.toMatch(/border-radius:\s*[1-9]/);
	});

	it('tactical route imports stratagem skin and preserves Firestore hooks', () => {
		expect(tacticalPage).toContain('coach-tactics-stratagem.css');
		expect(tacticalPage).toMatch(/coach-tactics-shell/);
		expect(tacticalPage).toMatch(/saveBoardState/);
		expect(tacticalPage).toMatch(/deployPlay/);
		expect(tacticalPage).not.toMatch(/#00ff00/);
	});

	it('tactical HUD components reject glass pill and neon deploy', () => {
		expect(tacticalDock).toMatch(/coach-tac-z1-well/);
		expect(tacticalDock).toMatch(/coach-tac-z4-btn--deploy/);
		expect(tacticalDock).not.toMatch(/backdrop-blur/);
		expect(tacticalDock).not.toMatch(/#00ff00/);
		expect(tacticalDock).not.toMatch(/rounded-xl/);
		expect(commandDrawer).toMatch(/coach-tac-z2-drawer/);
		expect(commandDrawer).not.toMatch(/backdrop-blur/);
	});

	it('pitch and route layers are flat SIEM strokes', () => {
		expect(gridPitch).not.toMatch(/NEON_GLOW|style=\{NEON_GLOW\}|filter:\s*drop-shadow/);
		expect(gridRoute).not.toMatch(/filter:\s*blur|drop-shadow\(/);
	});
});

describe('VS-3c — Coach drill library', () => {
	const drillCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/coach-drill-library.css'),
		'utf8',
	);
	const drillsView = readFileSync(
		join(process.cwd(), 'src/lib/coach/drills/CoachDrillsView.svelte'),
		'utf8',
	);

	it('coach-drill-library.css defines Z2 card SIEM contract', () => {
		expect(drillCss).toContain('.coach-drill-lib');
		expect(drillCss).toContain('.coach-drill-z2-card');
		expect(drillCss).toContain('.coach-drill-z4-cta');
		expect(drillCss).toMatch(/--pd-chamfer-md:\s*8px/);
		expect(drillCss).not.toMatch(/#fbbf24|--pd-action-gold/);
		expect(drillCss).not.toMatch(/backdrop-filter:\s*blur/);
		expect(drillCss).not.toMatch(/border-radius:\s*[1-9]/);
	});

	it('CoachDrillsView uses stratagem shell and card grid', () => {
		expect(drillsView).toContain('coach-drill-library.css');
		expect(drillsView).toMatch(/coach-drill-z2-grid/);
		expect(drillsView).toMatch(/coach-drill-z4-cta/);
		expect(drillsView).toMatch(/NEW DRILL/);
		expect(drillsView).toMatch(/openAssign/);
		expect(drillsView).not.toMatch(/6366f1|linear-gradient\(135deg/);
		expect(drillsView).not.toMatch(/border-radius:\s*999px|rounded-xl/);
	});
});

describe('VS-3d — Coach match-day scoreboard', () => {
	const matchCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/coach-match-day-scoreboard.css'),
		'utf8',
	);
	const matchView = readFileSync(
		join(process.cwd(), 'src/lib/coach/match-day/CoachMatchDayView.svelte'),
		'utf8',
	);

	it('coach-match-day-scoreboard.css defines SIEM Z-layer contract', () => {
		expect(matchCss).toContain('.coach-match-shell');
		expect(matchCss).toContain('.coach-match-z2-cell');
		expect(matchCss).toContain('.coach-match-z4-strap');
		expect(matchCss).toContain('.coach-match-z2-cell--flash');
		expect(matchCss).toMatch(/--pd-chamfer-md:\s*8px/);
		expect(matchCss).not.toMatch(/#fbbf24|--pd-action-gold/);
		expect(matchCss).not.toMatch(/backdrop-filter:\s*blur/);
		expect(matchCss).not.toMatch(/border-radius:\s*[1-9]/);
	});

	it('CoachMatchDayView uses score cells and persists match_sessions', () => {
		expect(matchView).toContain('coach-match-day-scoreboard.css');
		expect(matchView).toMatch(/coach-match-z2-cell/);
		expect(matchView).toMatch(/scoreFlashHome|scoreFlashAway/);
		expect(matchView).toMatch(/match_sessions/);
		expect(matchView).toMatch(/bumpScore/);
		expect(matchView).not.toMatch(/backdrop-blur|drop-shadow|rounded-full|matchLoggerPulse/);
	});
});

describe('VS-4a — Parent lounge shell', () => {
	const shellCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/parent-lounge-shell.css'),
		'utf8',
	);
	const parentLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/parent/+layout.svelte'),
		'utf8',
	);
	const dashboardPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/parent/dashboard/+page.svelte'),
		'utf8',
	);
	const householdPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/parent/household/+page.svelte'),
		'utf8',
	);

	it('parent-lounge-shell.css defines SIEM Z-layer contract', () => {
		expect(shellCss).toContain('.parent-lounge-shell');
		expect(shellCss).toContain('.parent-lounge-z1-well');
		expect(shellCss).toContain('.parent-lounge-z2-panel');
		expect(shellCss).toContain('.parent-lounge-z4-nav__link--active');
		expect(shellCss).toMatch(/--parent-lounge-gutter:\s*24px/);
		expect(shellCss).not.toMatch(/#fbbf24|--pd-action-gold/);
		expect(shellCss).not.toMatch(/backdrop-filter:\s*blur/);
		expect(shellCss).not.toMatch(/border-radius:\s*24px|border-radius:\s*999/);
	});

	it('parent layout wraps routes with lounge shell and nav', () => {
		expect(parentLayout).toContain('parent-lounge-shell.css');
		expect(parentLayout).toMatch(/parent-lounge-z4-nav/);
		expect(parentLayout).toMatch(/parent-lounge-z1-well/);
		expect(parentLayout).toMatch(/\/parent\/household/);
		expect(parentLayout).toMatch(/\/parent\/dashboard/);
	});

	it('dashboard and household use Z2 panels and 12-col grid', () => {
		expect(dashboardPage).toMatch(/parent-lounge-z2-panel/);
		expect(dashboardPage).toMatch(/bento-grid--12col bento-grid--liquid/);
		expect(dashboardPage).not.toMatch(/radial-gradient|a78bfa|rounded-vanguard/);
		expect(householdPage).toMatch(/parent-lounge-z2-panel/);
		expect(householdPage).toMatch(/bento-grid--12col/);
	});
});

describe('VS-4b — Parent VPC trust band', () => {
	const vpcCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/parent-vpc-trust-band.css'),
		'utf8',
	);
	const vpcPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/parent/vpc/+page.svelte'),
		'utf8',
	);

	it('parent-vpc-trust-band.css defines SIEM trust band contract', () => {
		expect(vpcCss).toContain('.parent-vpc-trust-band');
		expect(vpcCss).toContain('.parent-vpc-z1-well');
		expect(vpcCss).toContain('.parent-vpc-z2-panel');
		expect(vpcCss).toContain('.parent-vpc-z3-shield');
		expect(vpcCss).toContain('.parent-vpc-minimal-badge');
		expect(vpcCss).toContain('.parent-vpc-btn-update');
		expect(vpcCss).toMatch(/--pd-data-cyan:\s*#14b8a6|--pd-data-cyan,\s*#14b8a6/);
		expect(vpcCss).not.toMatch(/#fbbf24|--pd-action-gold|#06b6d4/);
		expect(vpcCss).not.toMatch(/box-shadow:\s*0\s+0|border-radius:\s*999/);
	});

	it('vpc page uses trust band hooks and Update consent CTA', () => {
		expect(vpcPage).toContain('parent-vpc-trust-band.css');
		expect(vpcPage).toMatch(/parent-vpc-trust-hero/);
		expect(vpcPage).toMatch(/Update consent/);
		expect(vpcPage).not.toMatch(/vpc-btn--primary|aggie-gold|border-radius:\s*999/);
		expect(vpcPage).not.toContain('<style>');
	});
});

describe('VS-4c — Parent bounty funding panel', () => {
	const bountyCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/parent-bounty-funding-panel.css'),
		'utf8',
	);
	const dashboardPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/parent/dashboard/+page.svelte'),
		'utf8',
	);
	const terminal = readFileSync(
		join(process.cwd(), 'src/routes/(app)/parent/dashboard/BountyTerminal.svelte'),
		'utf8',
	);
	const arena = readFileSync(
		join(process.cwd(), 'src/lib/components/parent/co-op/CoOpArena.svelte'),
		'utf8',
	);
	const claims = readFileSync(
		join(process.cwd(), 'src/lib/components/parent/ProofReviewQueue.svelte'),
		'utf8',
	);

	it('parent-bounty-funding-panel.css defines SIEM funding contract', () => {
		expect(bountyCss).toContain('.parent-bounty-funding-panel');
		expect(bountyCss).toContain('.parent-bounty-z2-panel');
		expect(bountyCss).toContain('.parent-bounty-z3-modal');
		expect(bountyCss).toContain('.parent-bounty-btn-deploy');
		expect(bountyCss).toContain('.parent-bounty-btn-audit');
		expect(bountyCss).toMatch(/--pd-nav-cyan|#06b6d4/);
		expect(bountyCss).not.toMatch(/#fbbf24|#ffcc00|backdrop-filter:\s*blur/);
		expect(bountyCss).not.toMatch(/border-radius:\s*999|border-radius:\s*24px/);
	});

	it('dashboard bounty surfaces use deploy/audit hooks and reject gold', () => {
		expect(dashboardPage).toContain('parent-bounty-funding-panel.css');
		expect(dashboardPage).toMatch(/parent-bounty-btn-deploy/);
		expect(dashboardPage).not.toMatch(/backdrop-filter:\s*blur/);
		expect(terminal).toMatch(/#parent-funding-source/);
		expect(terminal).toMatch(/parent-bounty-btn-deploy/);
		expect(terminal).not.toMatch(/#ffcc00|#00ff66|aggie-gold/);
		expect(arena).toMatch(/id="parent-funding-source"/);
		expect(arena).toMatch(/parent-bounty-chip--verified/);
		expect(arena).not.toMatch(/#ffcc00|a78bfa|backdrop-blur/);
		expect(claims).toMatch(/Audit claims/);
		expect(claims).toMatch(/parent-bounty-claims-panel/);
		expect(claims).not.toContain('<style>');
	});
});

describe('VS-5a — Director command center', () => {
	const directorCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/director-command-center.css'),
		'utf8',
	);
	const directorLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/director/+layout.svelte'),
		'utf8',
	);
	const directorPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/director/+page.svelte'),
		'utf8',
	);
	const commandCenter = readFileSync(
		join(process.cwd(), 'src/lib/components/director/os/DirectorCommandCenter.svelte'),
		'utf8',
	);

	it('director-command-center.css defines SIEM Z-layer contract', () => {
		expect(directorCss).toContain('.director-command-center-shell');
		expect(directorCss).toContain('.director-command-center');
		expect(directorCss).toContain('.director-z4-tab-rail');
		expect(directorCss).toContain('.director-cc-kpi-grid');
		expect(directorCss).toMatch(/#06b6d4|#14b8a6/);
		expect(directorCss).not.toMatch(/#fbbf24|--pd-action-gold|linear-gradient/);
		expect(directorCss).not.toMatch(/border-radius:\s*999|backdrop-filter:\s*blur/);
	});

	it('director route uses command center hooks and 12-col KPI grid', () => {
		expect(directorLayout).toContain('director-command-center.css');
		expect(directorLayout).toMatch(/director-command-center-shell/);
		expect(directorPage).toMatch(/director-z4-tab-rail/);
		expect(directorPage).not.toMatch(/dir-mobile-tabs__pill|border-radius:\s*999/);
		expect(directorPage).not.toContain('<style>');
		expect(commandCenter).toMatch(/director-command-center/);
		expect(commandCenter).toMatch(/bento-grid--12col bento-grid--liquid director-cc-kpi-grid/);
		expect(commandCenter).toMatch(/director-cc-compliance-band/);
		expect(commandCenter).not.toMatch(/#fbbf24|f59e0b|tw-rounded-xl/);
		expect(commandCenter).not.toContain('<style>');
	});
});

describe('VS-5b — Director field ops map', () => {
	const fieldOpsCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/director-field-ops-map.css'),
		'utf8',
	);
	const fieldOpsModule = readFileSync(
		join(process.cwd(), 'src/lib/components/director/os/FieldOpsModule.svelte'),
		'utf8',
	);
	const directorLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/director/+layout.svelte'),
		'utf8',
	);

	it('director-field-ops-map.css defines SIEM map contract', () => {
		expect(fieldOpsCss).toContain('.director-field-ops-map');
		expect(fieldOpsCss).toContain('.director-field-ops-z1-well');
		expect(fieldOpsCss).toContain('.director-field-ops-z2-panel');
		expect(fieldOpsCss).toContain('.director-field-ops-z3-weather--lock');
		expect(fieldOpsCss).toContain('.director-field-ops-btn-sync');
		expect(fieldOpsCss).toMatch(/#14b8a6|--pd-data-cyan/);
		expect(fieldOpsCss).not.toMatch(/#fbbf24|#06b6d4|backdrop-filter:\s*blur|linear-gradient/);
		expect(fieldOpsCss).not.toMatch(/border-radius:\s*999|box-shadow:\s*0\s+0/);
	});

	it('FieldOpsModule uses field ops hooks and preserves weather sync wiring', () => {
		expect(directorLayout).toContain('director-field-ops-map.css');
		expect(fieldOpsModule).toMatch(/director-field-ops-map/);
		expect(fieldOpsModule).toMatch(/Weather lock active/);
		expect(fieldOpsModule).toMatch(/field_weather_status/);
		expect(fieldOpsModule).toMatch(/syncFacilityToLegacyField/);
		expect(fieldOpsModule).not.toMatch(/tw-backdrop-blur|tw-rounded-xl|#fbbf24|from-slate-950/);
		expect(fieldOpsModule).not.toContain('<style>');
	});
});

describe('VS-6a — Comms hub persona skins', () => {
	const commsCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/comms-hub-persona-skins.css'),
		'utf8',
	);
	const messagesLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/messages/+layout.svelte'),
		'utf8',
	);
	const messagesPage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/messages/+page.svelte'),
		'utf8',
	);
	const announcements = readFileSync(
		join(process.cwd(), 'src/lib/components/comms/AnnouncementsInbox.svelte'),
		'utf8',
	);

	it('comms-hub-persona-skins.css defines Z-layer persona contract', () => {
		expect(commsCss).toContain('.comms-hub');
		expect(commsCss).toContain('.comms-hub--player');
		expect(commsCss).toContain('.comms-hub--coach');
		expect(commsCss).toContain('.comms-hub-z1-well');
		expect(commsCss).toContain('.comms-hub-z4-chrome__strap');
		expect(commsCss).toContain('--comms-primary-action');
		expect(commsCss).toMatch(/#06b6d4|#14b8a6/);
		expect(commsCss).not.toMatch(/backdrop-filter:\s*blur|border-radius:\s*999|linear-gradient/);
	});

	it('player persona allows gold primary; coach/parent/director reject gold chrome', () => {
		expect(commsCss).toMatch(/\.comms-hub--player\s*\{[^}]*#fbbf24/);
		expect(commsCss).toMatch(
			/\.comms-hub--coach,\s*\n\.comms-hub--parent,\s*\n\.comms-hub--director,\s*\n\.comms-hub--staff\s*\{[^}]*--pd-nav-cyan/,
		);
		expect(commsCss).not.toMatch(/\.comms-hub--coach[^\{]*\{[^}]*#fbbf24/);
		expect(commsCss).not.toMatch(/\.comms-hub--parent[^\{]*\{[^}]*#fbbf24/);
		expect(commsCss).not.toMatch(/\.comms-hub--director[^\{]*\{[^}]*#fbbf24/);
	});

	it('/messages layout injects persona class from role; page uses Z hooks', () => {
		expect(messagesLayout).toContain('comms-hub-persona-skins.css');
		expect(messagesLayout).toMatch(/comms-hub--player/);
		expect(messagesLayout).toMatch(/authStore\.role/);
		expect(messagesPage).toMatch(/comms-hub-z3-inbox/);
		expect(messagesPage).toMatch(/comms-hub-z2-msg-card/);
		expect(messagesPage).not.toContain('<style>');
		expect(announcements).not.toContain('<style>');
	});
});

describe('VS-6b — Coach clearance SIEM', () => {
	const clearanceCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/coach-clearance-siem.css'),
		'utf8',
	);
	const complianceLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/compliance/+layout.svelte'),
		'utf8',
	);
	const compliancePage = readFileSync(
		join(process.cwd(), 'src/routes/(app)/compliance/+page.svelte'),
		'utf8',
	);
	const directorLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/director/compliance/+layout.svelte'),
		'utf8',
	);
	const adminLayout = readFileSync(
		join(process.cwd(), 'src/routes/(app)/admin/coach-clearance/+layout.svelte'),
		'utf8',
	);
	const panopticon = readFileSync(
		join(process.cwd(), 'src/lib/components/compliance/CoachClearancePanopticon.svelte'),
		'utf8',
	);
	const checklist = readFileSync(
		join(process.cwd(), 'src/lib/components/compliance/CoachClearanceChecklist.svelte'),
		'utf8',
	);

	it('coach-clearance-siem.css defines SIEM clearance contract', () => {
		expect(clearanceCss).toContain('.coach-clearance-shell');
		expect(clearanceCss).toContain('.coach-clearance-z4-chrome');
		expect(clearanceCss).toContain('.coach-clearance-z1-well');
		expect(clearanceCss).toContain('.coach-clearance-panopticon');
		expect(clearanceCss).toMatch(/#06b6d4|#14b8a6/);
		expect(clearanceCss).not.toMatch(/#fbbf24|--pd-action-gold|backdrop-filter:\s*blur|border-radius:\s*999/);
	});

	it('/compliance layout and page use coach clearance hooks', () => {
		expect(complianceLayout).toContain('coach-clearance-siem.css');
		expect(complianceLayout).toMatch(/coach-clearance-shell/);
		expect(compliancePage).toMatch(/coach-clearance-z4-chrome/);
		expect(compliancePage).not.toContain('<style>');
		expect(checklist).not.toContain('<style>');
	});

	it('director and admin clearance routes share coach-clearance-shell', () => {
		expect(directorLayout).toContain('coach-clearance-siem.css');
		expect(directorLayout).toMatch(/coach-clearance-shell/);
		expect(adminLayout).toContain('coach-clearance-siem.css');
		expect(adminLayout).toMatch(/coach-clearance-shell/);
		expect(panopticon).toMatch(/coach-clearance-panopticon/);
		expect(panopticon).not.toContain('<style>');
	});
});

describe('VS-1a — Mission Hero Modal', () => {
	const modalSrc = readFileSync(
		join(process.cwd(), 'src/lib/components/hud/MissionHeroModal.svelte'),
		'utf8',
	);
	const scrimCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/player-modal-scrim.css'),
		'utf8',
	);
	const bountiesSrc = readFileSync(
		join(process.cwd(), 'src/lib/components/hud/ActiveBounties.svelte'),
		'utf8',
	);

	it('MissionHeroModal uses shared scrim util and hard shadow grammar', () => {
		expect(modalSrc).toContain('PlayerModalScrim');
		expect(modalSrc).not.toMatch(/backdrop-filter:\s*blur/);
		expect(scrimCss).toMatch(/12px\s+12px\s+0\s+0\s+var\(--pd-void-base\)/);
		expect(modalSrc).toContain('TERMINATE_LINK');
		expect(modalSrc).toContain('ENGAGE MISSION');
	});

	it('ActiveBounties opens modal before workout handoff', () => {
		expect(bountiesSrc).toContain('MissionHeroModal');
		expect(bountiesSrc).toMatch(/shouldOpenMissionHeroModal/);
		expect(bountiesSrc).toMatch(/missionModalQuest/);
	});
});

describe('VS-1b — Skill Tier Unlock Modal', () => {
	const modalSrc = readFileSync(
		join(process.cwd(), 'src/lib/components/hud/SkillTierUnlockModal.svelte'),
		'utf8',
	);
	const pageSrc = readFileSync(
		join(process.cwd(), 'src/routes/(app)/player/skill-tree/+page.svelte'),
		'utf8',
	);

	it('SkillTierUnlockModal matches CDO milestone copy and tokens', () => {
		expect(modalSrc).toContain('SYNAPTIC_EVOLUTION_CONFIRMED');
		expect(modalSrc).toContain('COMMIT_UPGRADE');
		expect(modalSrc).toContain('DEFER_INTEGRATION');
		expect(modalSrc).toContain('PlayerModalScrim');
		expect(modalSrc).toMatch(/directive/);
		expect(modalSrc).toMatch(/border:\s*2px\s+solid\s+var\(--pd-action-gold/);
		expect(modalSrc).not.toMatch(/border-radius/);
		expect(modalSrc).not.toMatch(/#22c55e|success-green/i);
	});

	it('skill-tree page detects tier advance and mounts modal', () => {
		expect(pageSrc).toContain('SkillTierUnlockModal');
		expect(pageSrc).toMatch(/tierUnlockTier/);
		expect(pageSrc).toMatch(/tierUnlockReady/);
		expect(pageSrc).toMatch(/previousTierId/);
	});
});

describe('VS-1c — Player modal scrim utility', () => {
	const scrimCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/player-modal-scrim.css'),
		'utf8',
	);
	const scrimComponent = readFileSync(
		join(process.cwd(), 'src/lib/components/player/PlayerModalScrim.svelte'),
		'utf8',
	);
	const missionModal = readFileSync(
		join(process.cwd(), 'src/lib/components/hud/MissionHeroModal.svelte'),
		'utf8',
	);
	const tierModal = readFileSync(
		join(process.cwd(), 'src/lib/components/hud/SkillTierUnlockModal.svelte'),
		'utf8',
	);
	const diegeticOverlay = readFileSync(
		join(process.cwd(), 'src/lib/components/player/PlayerDiegeticOverlay.svelte'),
		'utf8',
	);
	const dossierCss = readFileSync(DOSSIER_CSS, 'utf8');
	const shellSrc = readFileSync(
		join(process.cwd(), 'src/lib/components/shell/PlayerShell.svelte'),
		'utf8',
	);

	it('defines ss-scrim-overlay and ss-modal-z4-hero contract', () => {
		expect(scrimCss).toContain('.ss-scrim-overlay');
		expect(scrimCss).toContain('.ss-modal-z4-hero');
		expect(scrimCss).toContain('.ss-modal-directive');
		expect(scrimCss).toMatch(/rgba\(0,\s*0,\s*0,\s*0\.85\)/);
		expect(scrimCss).toMatch(/--pd-z-modal-scrim:\s*4000/);
		expect(scrimCss).toMatch(/--pd-z-modal-hero:\s*4001/);
		expect(scrimCss).not.toMatch(/backdrop-filter:\s*blur/);
		expect(scrimCss).not.toMatch(/border-radius/);
	});

	it('PlayerModalScrim exposes directive variant for tier unlock only', () => {
		expect(scrimComponent).toMatch(/directive/);
		expect(tierModal).toMatch(/directive/);
		expect(missionModal).not.toMatch(/\bdirective\b/);
		expect(diegeticOverlay).not.toMatch(/\bdirective\b/);
	});

	it('all Player Z4 modals consume PlayerModalScrim', () => {
		expect(missionModal).toContain('PlayerModalScrim');
		expect(tierModal).toContain('PlayerModalScrim');
		expect(diegeticOverlay).toContain('PlayerModalScrim');
		expect(diegeticOverlay).not.toMatch(/backdrop-filter:\s*blur/);
	});

	it('canonical scrim token and shell import wired', () => {
		expect(dossierCss).toContain('--pd-scrim-void-canonical');
		expect(shellSrc).toContain('player-modal-scrim.css');
	});
});

describe('VS-2a — Train Execute Theater', () => {
	const trainCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/player-train-theater.css'),
		'utf8',
	);
	const workoutSrc = readFileSync(
		join(process.cwd(), 'src/routes/(app)/player/workout/+page.svelte'),
		'utf8',
	);

	it('player-train-theater.css defines Z-layer contract', () => {
		expect(trainCss).toContain('.pw-theater__z4-scan');
		expect(trainCss).toMatch(/\.pw-exec\.pw-exec-commit/);
		expect(trainCss).toMatch(/--pd-data-cyan/);
		expect(trainCss).toMatch(/--pd-atom-amber/);
		expect(trainCss).not.toMatch(/backdrop-filter:\s*blur/);
		expect(trainCss).not.toMatch(/border-radius:\s*[1-9]/);
		expect(trainCss).not.toMatch(/linear-gradient\s*\(\s*180deg/);
	});

	it('workout page wires theater skin and single EXEC_COMMIT gold focal', () => {
		expect(workoutSrc).toContain('player-train-theater.css');
		expect(workoutSrc).toContain('pw-theater__z4-scan');
		expect(workoutSrc).toContain('EXEC_COMMIT');
		expect(workoutSrc).toMatch(/pw-exec-commit/);
		expect(workoutSrc).not.toMatch(/pw-exec--transmit pw-exec--transmit/);
		const commitMatches = workoutSrc.match(/pw-exec-commit/g) ?? [];
		expect(commitMatches.length).toBe(1);
	});
});

describe('VS-2b — Armory + Stats telemetry pass', () => {
	const telemetryCss = readFileSync(
		join(process.cwd(), 'src/lib/styles/player-armory-stats-telemetry.css'),
		'utf8',
	);
	const armorySrc = readFileSync(
		join(process.cwd(), 'src/routes/(app)/player/armory/+page.svelte'),
		'utf8',
	);
	const statsSrc = readFileSync(
		join(process.cwd(), 'src/routes/(app)/stats/+page.svelte'),
		'utf8',
	);

	it('telemetry CSS defines armory + stats Z-layer contract', () => {
		expect(telemetryCss).toContain("[data-region='quartermaster-armory']");
		expect(telemetryCss).toContain('.pos-stats');
		expect(telemetryCss).toMatch(/\.armory-deploy-btn\.pd-os-btn/);
		expect(telemetryCss).toMatch(/--pd-data-cyan/);
		expect(telemetryCss).toMatch(/--pd-grey-trim/);
		expect(telemetryCss).not.toMatch(/linear-gradient\s*\(\s*180deg/);
		expect(telemetryCss).not.toMatch(/backdrop-filter:\s*blur/);
	});

	it('armory deploy uses data variant (teal, not gold primary)', () => {
		expect(armorySrc).toContain('player-armory-stats-telemetry.css');
		expect(armorySrc).toMatch(/variant="data"[\s\S]*?armory-deploy-btn/);
		expect(armorySrc).toMatch(/bento-grid--12col bento-grid--liquid/);
	});

	it('stats player route uses bento liquid 12-col + telemetry CSS', () => {
		expect(statsSrc).toContain('player-armory-stats-telemetry.css');
		expect(statsSrc).toMatch(/bento-grid--12col=\{isPlayerRole\}/);
		expect(statsSrc).toMatch(/bento-grid--liquid=\{isPlayerRole\}/);
		expect(statsSrc).toContain('VanguardProtocolPanel');
		expect(statsSrc).toMatch(/stats-analytics-void/);
	});
});
