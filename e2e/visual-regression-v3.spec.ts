import { test, expect, type Page } from '@playwright/test';

// Helper function to inject authentication JWT into localStorage for unblocked testing
async function bypassRouteGuards(page: Page, role: string, uid: string = 'mock-test-uid') {
    await page.addInitScript(({ role, uid }: { role: string, uid: string }) => {
        window.localStorage.setItem('auth_token', JSON.stringify({
            uid,
            email: `${role}-test@sstracker.app`,
            emailVerified: true
        }));
        window.localStorage.setItem('user_profile', JSON.stringify({
            isProfileComplete: true,
            role: role,
            clubId: 'mock-club-123',
            teamId: 'mock-team-123',
            playerName: 'Test Player',
            householdId: 'mock-household-123',
            vpcStatus: 'verified'
        }));
    }, { role, uid });
}

test.describe('Admin OS', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'admin', 'mock-admin-uid');
        await page.goto('/admin/overview');
    });

    test('Microscopic Style, Hover, and Technical Mainboard Check', async ({ page }) => {
        // Enforce 90-degree square corners on panel card borders
        const panels = page.locator('.admin-panel, [data-panel]');
        const count = await panels.count();
        for (let i = 0; i < count; i++) {
            const borderRadius = await panels.nth(i).evaluate((el) => window.getComputedStyle(el).borderRadius);
            expect(borderRadius).toBe('0px');
        }

        // Hover State Verification
        const navLinks = page.locator('.vanguard-link, .nav-link');
        const linkCount = await navLinks.count();
        if (linkCount > 0) {
            const element = navLinks.first();
            await element.hover();
            // Wait for kinetic transition (150-250ms) to complete
            await page.waitForTimeout(250); 
            const computedColor = await element.evaluate(el => window.getComputedStyle(el).color);
            // Assert transition to Data Cyan (#14b8a6) or Atompunk Amber (#f59e0b) or similar active state
            expect(['rgb(20, 184, 166)', 'rgb(245, 158, 11)']).toContain(computedColor);
        }

        // Tooltip & Popover Gating
        const tooltips = page.locator('.tooltip-trigger, [data-tooltip]');
        const tooltipCount = await tooltips.count();
        if (tooltipCount > 0) {
            const tooltipTrigger = tooltips.first();
            await tooltipTrigger.hover();
            await page.waitForTimeout(250);
            const tooltip = page.locator('.tooltip, [role="tooltip"]').first();
            await expect(tooltip).toBeVisible();
            const bg = await tooltip.evaluate(el => window.getComputedStyle(el).backgroundColor);
            expect(['rgb(11, 15, 25)', '#0B0F19']).toContain(bg);
        }
        
        await page.screenshot({ path: 'audit-artifacts/admin/desktop-overview-hover-state.png' });
    });
});
