// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import WearablesSync from '../WearablesSync.svelte';

describe('Wearable API Integrations (Mock)', () => {
	it('should render the connection buttons', () => {
		const { getByText } = render(WearablesSync);
		expect(getByText('Connect Apple HealthKit')).toBeTruthy();
		expect(getByText('Connect Garmin')).toBeTruthy();
		expect(getByText('Connect Whoop')).toBeTruthy();
	});

	it('should simulate connecting a wearable and capturing HRV', async () => {
		const { getByText, findByText } = render(WearablesSync);
		
		const garminBtn = getByText('Connect Garmin');
		await fireEvent.click(garminBtn);
		
		// The mock delay is 800ms
		const hrvText = await findByText(/Latest HRV/i, {}, { timeout: 1500 });
		expect(hrvText).toBeTruthy();
		expect(getByText('Garmin Fenix 7')).toBeTruthy();
	});
});
