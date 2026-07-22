// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Table from '../Table.svelte';

describe('Table', () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
	});

	afterEach(() => {
		document.body.removeChild(container);
		container = null as any;
	});

	it('renders correctly', () => {
		const component = mount(Table, { target: container });
		expect(container.innerHTML).toContain('table');
		unmount(component);
	});
});
