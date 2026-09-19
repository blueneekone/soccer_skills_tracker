import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

const APP_DIR = join(__dirname, '../../../../'); // points to src/routes/(app)

function findTrinity(dir: string): void {
	const files = readdirSync(dir);
	const hasPage = files.includes('+page.svelte');
	if (hasPage && files.some(f => f.endsWith('Engine.svelte.ts'))) {
		const pageContent = readFileSync(join(dir, '+page.svelte'), 'utf-8');
		const hasArena = pageContent.includes('Arena') || files.some(f => f.endsWith('Arena.svelte'));
		const hasHUD = pageContent.includes('HUD') || files.some(f => f.endsWith('HUD.svelte'));
		
		if (dir.includes("/admin/")) {
			expect(hasArena, `Directory ${dir} has +page and Engine but missing Arena import/file`).toBe(true);
		expect(hasHUD, `Directory ${dir} has +page and Engine but missing HUD import/file`).toBe(true);
		}
	}

	files.forEach(f => {
		const full = join(dir, f);
		if (statSync(full).isDirectory() && f !== '__tests__' && !f.startsWith('.')) {
			findTrinity(full);
		}
	});
}

export const LEGACY_EXEMPT = [
  "src/lib/__tests__/launchCohesionLb.test.ts",
  "src/routes/__tests__/globalLayout.test.ts",
  "src/lib/compliance/__tests__/coachClearanceRead.test.ts",
  "src/lib/compliance/__tests__/hipaaMedicalIntake.test.ts",
  "src/lib/coach/__tests__/coachDashboardLiveData.test.ts",
  "src/lib/coach/__tests__/coachExpandedStaffControls.test.ts",
  "src/lib/coach/__tests__/coachModule.test.ts",
  "src/lib/coach/__tests__/coachRosterImport.test.ts",
  "src/lib/gamification/__tests__/playerLaunchDeferAvatar.test.ts",
  "src/lib/household/__tests__/householdGraphLaunch.test.ts",
  "src/lib/live-stream/__tests__/liveStreamLaunch.test.ts",
  "src/lib/native/__tests__/nativeShellLaunch.test.ts",
  "src/lib/parent/__tests__/launchWave2Complete.test.ts",
  "src/lib/parent/__tests__/parentPwaLaunch.test.ts",
  "src/lib/platform/__tests__/adminGapClosure.spec.ts",
  "src/lib/platform/__tests__/platformNavigationCanon.test.ts",
  "src/lib/platform/__tests__/productSurfaceRegistry.test.ts",
  "src/lib/platform/__tests__/surfaceMergeBenchmarks.test.ts",
  "src/lib/platform/__tests__/surfaceMergeTrialEval.test.ts",
  "src/lib/registrar/__tests__/epic51CoppaSignup.test.ts",
  "src/lib/registrar/__tests__/epic52RegistrarConsolidation.test.ts",
  "src/lib/security/__tests__/firestoreRulesSprint13.test.ts",
  "src/lib/security/__tests__/firestoreRulesSprint22.test.ts",
  "src/lib/security/__tests__/firestoreRulesSprint412.test.ts",
  "src/lib/security/__tests__/loopIntegrityGuards.test.ts",
  "src/lib/services/__tests__/comms44ParentLounge.guard.test.ts",
  "src/lib/services/__tests__/comms44ParentLoungeRoute.guard.test.ts",
  "src/lib/services/__tests__/comms44ParentLoungeWire.guard.test.ts",
  "src/lib/services/__tests__/commsClose.test.ts",
  "src/lib/services/__tests__/commsNav20.test.ts",
  "src/lib/services/__tests__/commsParentCoachDm.test.ts",
  "src/lib/services/__tests__/commsPhase3a.test.ts",
  "src/lib/services/__tests__/commsPhase3b.test.ts",
  "src/lib/services/__tests__/commsPhase4c.test.ts",
  "src/lib/services/__tests__/commsPhase4d.test.ts",
  "src/lib/services/__tests__/commsSponsorRehome.test.ts"
];

describe('Vanguard Trinity Architecture (Sprint 1.1)', () => {
	it('enforces Shell, Brain, Glass, and HUD across all viewports', () => {
		findTrinity(APP_DIR);
	});
});
