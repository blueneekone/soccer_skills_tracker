/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import '@testing-library/jest-dom/vitest';
import UniversalExportHub from '$lib/components/_shared/UniversalExportHub.svelte';

describe('UniversalExportHub', () => {
	it('renders export buttons', () => {
		const { getByText, getByTitle } = render(UniversalExportHub, {
			data: [{ id: 1, name: 'Test' }],
			columns: [{ key: 'name', label: 'Name' }],
			filename: 'test-export'
		});

		expect(getByTitle('Export to CSV')).toBeInTheDocument();
		expect(getByTitle('Export to JSON')).toBeInTheDocument();
		expect(getByTitle('Export to PDF')).toBeInTheDocument();
	});
});
