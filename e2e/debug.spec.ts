import { test, expect } from '@playwright/test';

async function bypassRouteGuards(page, role, uid) {
    await page.goto('/');
    await page.evaluate(({ role, uid }) => {
        window.localStorage.setItem('auth_token', JSON.stringify({
            isAuthenticated: true,
            user: { uid: uid, email: `${role}-test@sstracker.app`, emailVerified: true }
        }));
        window.localStorage.setItem('user_profile', JSON.stringify({
            isProfileComplete: true,
            role: role,
            clubId: 'mock-club-123',
            // Wait, does player require more fields?
            currentStreak: 5,
            longestStreak: 10,
            totalXp: 500,
            operativeAvatar: {},
            ownedPortraitParts: []
        }));
    }, { role, uid });
}

test('Debug Player Skill Tree', async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    
    await bypassRouteGuards(page, 'player', 'mock-player-uid');
    console.log('Navigating to skill-tree...');
    await page.goto('/player/skill-tree');
    console.log('Waiting for network idle...');
    await page.waitForTimeout(5000);
    console.log('Printing body innerHTML:');
    const html = await page.evaluate(() => document.body.innerHTML);
    console.log(html);
});
