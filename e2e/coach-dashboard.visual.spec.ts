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
            vpcStatus: 'verified',
            clearance: { status: 'cleared' }
        }));
    }, { role, uid });
}

test.describe('Coach OS', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
        await page.goto('/coach');
    });

    test('Coach Dashboard Squad Telemetry Refactor Screenshot', async ({ page }, testInfo) => {
        // Wait for dashboard to render
        await page.waitForSelector('[data-region="squad-telemetry"]', { state: 'visible' });
        
        const projectName = testInfo.project.name.replace(/\s+/g, '-').toLowerCase();
        
        // Take full page screenshot and component screenshot
        await page.screenshot({ path: `audit-artifacts/coach/dashboard-full-${projectName}.png`, fullPage: true });
        
        const telemetryPanel = page.locator('[data-region="squad-telemetry"]');
        await telemetryPanel.screenshot({ path: `audit-artifacts/coach/squad-telemetry-panel-${projectName}.png` });
    });
});
