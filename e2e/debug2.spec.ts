import { test, expect } from '@playwright/test';

async function bypassRouteGuards(page, role, uid = 'mock-test-uid') {
    await page.addInitScript(({ role, uid }) => {
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

test('Debug Fan OS', async ({ page }) => {
    page.on('console', msg => console.log(`BROWSER CONSOLE: ${msg.text()}`));
    await bypassRouteGuards(page, 'fan', 'mock-fan-uid');
    
    console.log('Navigating to Fan OS broadcast...');
    await page.goto('/fan/broadcast');
    await page.waitForLoadState('networkidle');
    
    console.log('Printing body innerHTML:');
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log(html);
});
