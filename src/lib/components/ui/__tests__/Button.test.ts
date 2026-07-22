// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Button from '../Button.svelte';

describe('Button', () => {
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
		const component = mount(Button, { target: container, props: { label: 'Click Me' } });
		expect(container.textContent).toContain('Click Me');
		unmount(component);
	});
});
