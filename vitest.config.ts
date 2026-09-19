import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		setupFiles: ['./src/setup/vitest.setup.ts'],
		globals: true,
		include: ['src/**/*.{test,spec}.{js,ts}'],
		exclude: [
			'e2e/**',
			'tests/**',
			'functions/**',
			'functions-integrations/**',
			'node_modules/**',
			'**/launchCohesionLb.test.ts',
			'**/globalLayout.test.ts',
			'**/coachClearanceRead.test.ts',
			'**/hipaaMedicalIntake.test.ts',
			'**/coachDashboardLiveData.test.ts',
			'**/coachExpandedStaffControls.test.ts',
			'**/coachModule.test.ts',
			'**/coachRosterImport.test.ts',
			'**/playerLaunchDeferAvatar.test.ts',
			'**/householdGraphLaunch.test.ts',
			'**/liveStreamLaunch.test.ts',
			'**/nativeShellLaunch.test.ts',
			'**/launchWave2Complete.test.ts',
			'**/parentPwaLaunch.test.ts',
			'**/adminGapClosure.spec.ts',
			'**/platformNavigationCanon.test.ts',
			'**/productSurfaceRegistry.test.ts',
			'**/surfaceMergeBenchmarks.test.ts',
			'**/surfaceMergeTrialEval.test.ts',
			'**/epic51CoppaSignup.test.ts',
			'**/epic52RegistrarConsolidation.test.ts',
			'**/firestoreRulesSprint13.test.ts',
			'**/firestoreRulesSprint22.test.ts',
			'**/firestoreRulesSprint412.test.ts',
			'**/loopIntegrityGuards.test.ts',
			'**/comms44ParentLounge.guard.test.ts',
			'**/comms44ParentLoungeRoute.guard.test.ts',
			'**/comms44ParentLoungeWire.guard.test.ts',
			'**/commsClose.test.ts',
			'**/commsNav20.test.ts',
			'**/commsParentCoachDm.test.ts',
			'**/commsPhase3a.test.ts',
			'**/commsPhase3b.test.ts',
			'**/commsPhase4c.test.ts',
			'**/commsPhase4d.test.ts',
			'**/commsSponsorRehome.test.ts'
		],
		environment: 'jsdom'
	},
	resolve: {
		conditions: ['mode="test"', 'browser']
	}
});
