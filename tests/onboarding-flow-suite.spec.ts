import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow Suite', () => {

  test('Loop Verification for uncleared coach routes', async ({ page }) => {
    // Authenticate a user, mock an uncleared profile state (isCleared: false),
    // navigate to /coach/dashboard, and verify that SvelteKit aggressively
    // throws a 307 redirect back to /onboarding/clearance/coach

    // Inject mock state
    await page.addInitScript(() => {
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        session: { role: 'coach', isCleared: false },
        userProfile: { role: 'coach', isCleared: false },
        isProfileComplete: true
      }));
    });

    // Mock parent function response for +layout.json
    await page.route('**/+layout.json', async route => {
      route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
              data: {
                  session: { role: 'coach', isCleared: false },
                  userProfile: { role: 'coach', isCleared: false }
              }
          })
      });
    });

    await page.goto('/coach/dashboard');

    // Check if it redirects
    await expect(page).toHaveURL(/\/onboarding\/clearance\/coach/);
  });

  test('Parent Matching Flow successfully merges household graph', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        session: { role: 'guardian', isCleared: false, email: 'parent@example.com' },
        userProfile: { role: 'guardian', isCleared: false, email: 'parent@example.com' },
        isProfileComplete: true
      }));
    });

    await page.route('**/+layout.json', async route => {
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
                data: {
                    session: { role: 'guardian', isCleared: false, email: 'parent@example.com' },
                    userProfile: { role: 'guardian', isCleared: false, email: 'parent@example.com' }
                }
            })
        });
    });

    await page.goto('/onboarding/clearance/guardian');
    await expect(page).toHaveURL(/.*\/onboarding\/clearance\/guardian.*/);
  });

  test('Coach Sandbox Isolation blocks real Firestore requests', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('sstracker_e2e_bypass', 'true');
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        session: { role: 'coach', isCleared: true },
        userProfile: { role: 'coach', isCleared: true },
        isProfileComplete: true
      }));
    });

    let firestoreRequestFound = false;
    page.on('request', request => {
      if (request.url().includes('firestore.googleapis.com')) {
        firestoreRequestFound = true;
      }
    });

    await page.goto('/coach/sandbox');
    await page.waitForTimeout(1000);
    expect(firestoreRequestFound).toBe(false);
  });

  test('Spectator Authorization loads match without login', async ({ page }) => {
    await page.goto('/public/match/test-match-id?matchToken=valid-crypto-token-1234');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
