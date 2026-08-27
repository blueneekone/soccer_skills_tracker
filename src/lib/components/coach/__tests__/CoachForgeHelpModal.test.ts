// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CoachForgeHelpModal from '../drill/CoachForgeHelpModal.svelte';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('CoachForgeHelpModal & Operating Guide', () => {
	it('renders modal when open=true with all core sections and topics', () => {
		const { getByText, getByPlaceholderText } = render(CoachForgeHelpModal, {
			open: true
		});

		expect(getByText(/THE FORGE · OPERATING MANUAL/i)).toBeTruthy();
		expect(getByPlaceholderText(/Search guide/i)).toBeTruthy();
		expect(getByText(/The Forge: Unified Tactical Studio/i)).toBeTruthy();
		expect(getByText(/Natural Language Tactical Formulation/i)).toBeTruthy();
		expect(getByText(/Pitch Whiteboard & Spatial Diagramming/i)).toBeTruthy();
		expect(getByText(/Coaching Blueprint & Sideline Drill Sheet/i)).toBeTruthy();
		expect(getByText(/Drill Library Arena & Benchmark Catalog/i)).toBeTruthy();
		expect(getByText(/War Room Integration & Match-Day Whiteboard/i)).toBeTruthy();
		expect(getByText(/Pro Tips & Sideline Operations/i)).toBeTruthy();
	});

	it('filters topics by search query correctly', async () => {
		const { getByPlaceholderText, queryByText } = render(CoachForgeHelpModal, {
			open: true
		});

		const searchInput = getByPlaceholderText(/Search guide/i);
		await fireEvent.input(searchInput, { target: { value: 'whiteboard' } });

		expect(queryByText(/Pitch Whiteboard & Spatial Diagramming/i)).toBeTruthy();
		expect(queryByText(/Natural Language Tactical Formulation/i)).toBeNull();
	});

	it('Forge +page.svelte integrates CoachForgeHelpModal with header trigger', () => {
		const pageSrc = readFileSync(
			join(process.cwd(), 'src/routes/(app)/coach/forge/+page.svelte'),
			'utf-8'
		);

		expect(pageSrc).toMatch(/CoachForgeHelpModal/);
		expect(pageSrc).toMatch(/showHelpModal/);
		expect(pageSrc).toMatch(/Help & Manual/);
	});
});
