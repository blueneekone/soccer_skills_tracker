import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Viewport & Kinetic Cohesion Test Suite', () => {
	const layoutPath = path.resolve(process.cwd(), 'src/routes/(app)/+layout.svelte');
	const appMenuPath = path.resolve(process.cwd(), 'src/lib/components/shell/AppMenuSheet.svelte');
	const contextMenuPath = path.resolve(process.cwd(), 'src/lib/components/coach/TacticalContextMenu.svelte');
	const contextRadialPath = path.resolve(process.cwd(), 'src/lib/components/coach/tactical/hud/ContextRadial.svelte');
	const orgToolbarPath = path.resolve(process.cwd(), 'src/lib/components/admin/OrganizationsToolbar.svelte');

	it('Asserts that the root shell height maps exactly to the 100dvh bounding block', () => {
		const content = fs.readFileSync(layoutPath, 'utf-8');
		// Shell must have class with tw-h-[100dvh] and tw-flex-col
		expect(content).toContain('tw-h-[100dvh]');
		expect(content).toContain('tw-flex-col');
		expect(content).toContain('app-shell');
	});

	it('Asserts that parent wrappers of bento grids enforce tw-overflow-hidden and restrict vertical scrolling', () => {
		const content = fs.readFileSync(layoutPath, 'utf-8');
		// The parent layout wrapper <main> should be overflow-hidden
		expect(content).toMatch(/<main[^>]*tw-overflow-hidden/);
	});

	it('Asserts that all dropdown overlays utilize absolute background opacity', () => {
		const appMenuContent = fs.readFileSync(appMenuPath, 'utf-8');
		const contextMenuContent = fs.readFileSync(contextMenuPath, 'utf-8');
		const contextRadialContent = fs.readFileSync(contextRadialPath, 'utf-8');
		const orgToolbarContent = fs.readFileSync(orgToolbarPath, 'utf-8');

		// 1. AppMenuSheet must use solid background (#0B0F19) and lack semi-transparent backgrounds/backdrops on overlay
		expect(appMenuContent).toContain('background: #0B0F19 !important;');
		expect(appMenuContent).not.toContain('background: rgba(15, 23, 42, 0.98);');

		// 2. TacticalContextMenu must use solid background (#0B0F19) and have tw-border-slate-800, tw-z-50
		expect(contextMenuContent).toContain('tw-bg-[#0B0F19]');
		expect(contextMenuContent).toContain('tw-border-slate-800');
		expect(contextMenuContent).toContain('tw-z-50');
		expect(contextMenuContent).not.toContain('tw-bg-[#020202]/85');

		// 3. ContextRadial must use solid background (#0B0F19) and have tw-border-slate-800, tw-z-50
		expect(contextRadialContent).toContain('tw-bg-[#0B0F19]');
		expect(contextRadialContent).toContain('tw-border-slate-800');
		expect(contextRadialContent).toContain('tw-z-50');
		expect(contextRadialContent).not.toContain('tw-bg-[#020202]/96');

		// 4. OrganizationsToolbar filter dropdown overlay must use solid border-slate-800
		expect(orgToolbarContent).toContain('tw-border-slate-800');
		expect(orgToolbarContent).toMatch(/tw-absolute[^"]*tw-border-slate-800/);
	});
});
