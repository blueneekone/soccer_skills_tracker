import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 6 remote wrap of production SSTracker.
 * Parent-first cold start: guardians land on /parent/household.
 * Comment out `server` and run `npm run native:prepare` for bundled local QA.
 */
const config: CapacitorConfig = {
	appId: 'app.sstracker.parent',
	appName: 'SSTracker',
	webDir: 'build',
	server: {
		url: 'https://sstracker.app/parent/household',
		cleartext: false,
		androidScheme: 'https',
	},
	plugins: {
		SplashScreen: {
			launchAutoHide: true,
			backgroundColor: '#020202',
		},
		StatusBar: {
			style: 'DARK',
			backgroundColor: '#020202',
		},
	},
};

export default config;
