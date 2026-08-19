import { describe, it, expect } from 'vitest';
import { sportsConfigStore, LEGACY_SPORT_CONFIGS } from '../sportsConfigs.svelte.js';

describe('sportsConfigs store', () => {
	it('provides legacy configs fallback for soccer', () => {
		const soccerConfig = sportsConfigStore.getConfig('soccer');
		expect(soccerConfig).toBeDefined();
		expect(soccerConfig.sportId).toBe('soccer');
		expect(soccerConfig.displayName).toBe('Soccer');
		expect(soccerConfig.attributes).toHaveLength(6);
	});

	it('resolves active config from aliases', () => {
		const config = sportsConfigStore.resolveActiveConfig('hoops');
		expect(config.sportId).toBe('basketball');
	});

	it('falls back to generic athletics for unknown sport', () => {
		const config = sportsConfigStore.resolveActiveConfig('quidditch');
		expect(config.sportId).toBe('generic');
	});

	it('exposes legacyConfigs map', () => {
		expect(sportsConfigStore.legacyConfigs).toBeDefined();
		expect(sportsConfigStore.legacyConfigs.soccer).toBeDefined();
	});
});
