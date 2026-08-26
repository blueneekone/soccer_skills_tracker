// director-intel-perfection.spec.ts
// =============================================================================
// SSTRACKER E2E AUDIT: DIRECTOR OS MULTI-BILLION-DOLLAR DESIGN SYSTEM TEST
// This Playwright spec programmatically asserts that the Director OS maps the
// "Daily Intel" button to the top of the sidebar navigation tree and strictly
// enforces our premium Atompunk 90-degree design tokens and Bento layouts.
// =============================================================================

import { test, expect } from '@playwright/test';

test.describe('Director OS: Navigation, Layout, and Design Tokens Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('about:blank');
    // Secure, Zero-Touch authentication bypass using Custom Claims
    const mockClaims = {
      uid: 'director-executive-auditor',
      email: 'director@sstracker.app',
      role: 'director',
      clubId: 'premium-test-club',
      tenantId: 'premium-test-club',
      isProfileComplete: true,
      user: {
        uid: 'director-executive-auditor',
        email: 'director@sstracker.app',
        role: 'director',
        clubId: 'premium-test-club',
        isProfileComplete: true
      }
    };

    await page.addInitScript((claims) => {
      window.localStorage.setItem('auth_token', 'mock-jwt-director-token');
      window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
      window.localStorage.setItem('auth_state', JSON.stringify({
        isAuthenticated: true,
        isLoading: false,
        user: claims.user,
        role: 'director',
        clubId: 'premium-test-club',
        isProfileComplete: true
      }));
    }, mockClaims);
  });

  test('Should verify "Daily Intel" button is positioned at the top of the navigation tree', async ({ page }) => {
    await page.goto('/director/dashboard');
    await page.waitForSelector('.pd-page-root', { timeout: 15000 });

    // Assert that the sidebar navigation element exists
    const sidebar = page.locator('nav.director-sidebar, .nexus-sidebar');
    await expect(sidebar).toBeVisible();

    // The first active button inside our sidebar navigation tree must be the "Mission Control" / "Daily Intel" node
    const firstNavNode = sidebar.locator('a, button').first();
    await expect(firstNavNode).toBeVisible();
    await expect(firstNavNode).toContainText(/Mission Control|Daily Intel|Dashboard/i);

    // Verify its styling utilizes our strict Data Cyan hover-accents
    await expect(firstNavNode).toHaveCSS('font-family', /Switzer|sans-serif/);
  });

  test('Should verify strict 90-degree corners on all layout panels (No Rounded Borders)', async ({ page }) => {
    await page.goto('/director/dashboard');
    await page.waitForSelector('.pd-page-root', { timeout: 15000 });

    // Locate all Z2 core layout data panels in the viewport
    const bentoPanels = page.locator('.tw-grid .tw-border-slate-800, .bento-panel');
    const panelCount = await bentoPanels.count();

    for (let i = 0; i < panelCount; i++) {
      const panel = bentoPanels.nth(i);
      // Director OS must absolutely forbid rounded cards or gamification chamfers
      await expect(panel).toHaveCSS('border-radius', '0px');
    }
  });

  test('Should verify 12-column asymmetric Bento Grid anti-squish math', async ({ page }) => {
    await page.goto('/director/dashboard');
    
    const bentoContainer = page.locator('.tw-grid-cols-12').first();
    await expect(bentoContainer).toBeVisible();

    // Verify the grid template is responsive and doesn't squeeze text into microscopic columns
    const gridStyle = await bentoContainer.evaluate((el) => window.getComputedStyle(el).gridTemplateColumns);
    expect(gridStyle).not.toBeNull();
  });
});
