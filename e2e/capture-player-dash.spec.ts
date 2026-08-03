import { test, expect } from '@playwright/test';
test('Capture player dashboard', async ({ page }) => {
    // Override authentication
    await page.addInitScript(() => {
        (window as any).__TEST_PROFILE__ = {
            uid: 'test-user',
            email: 'test@example.com',
            role: 'player',
            isProfileComplete: true,
            isConsented: true,
            operativeAvatar: {},
        };
    });

    await page.goto('http://127.0.0.1:5173/player/dashboard');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'audit-artifacts/player-dashboard-post-fix.png', fullPage: true });
});
