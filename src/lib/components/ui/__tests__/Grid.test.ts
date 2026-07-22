// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Grid from '../Grid.svelte';

describe('Grid', () => {
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
		const component = mount(Grid, { target: container });
		expect(container.innerHTML).toContain('div');
		unmount(component);
	});
});
