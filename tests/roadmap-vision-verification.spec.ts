import { test, expect } from '@playwright/test';

// =============================================================================
// SSTRACKER ENTERPRISE VISION VERIFICATION SUITE
// This suite strictly asserts the features, access boundaries, and design tokens
// outlined in ROADMAP.md and the Master Design System (SKILL.md).
// It ignores any outdated layouts and tests to the real, functional platform vision.
// =============================================================================

test.describe('1. Global Access Gates & Zero-Touch Authentication', () => {
  test('Bypasses login via programmatically minted Custom JWT Claims', async ({ page }) => {
    // Assert that we don't use manual UI login screens for automated testing.
    // Instead, we inject a custom JWT token containing elevated role permissions.
    await page.addInitScript(() => {
      window.localStorage.setItem('firebase_auth_mock', JSON.stringify({
        uid: 'test-admin-uid',
        email: 'ecwaechtler@gmail.com',
        claims: { role: 'admin', clubId: 'aggiesfc' }
      }));
    });

    await page.goto('/admin/overview');
    // Ensure we reached the dashboard and SvelteKit did not redirect to onboarding
    await expect(page.locator('.app-shell')).toBeVisible();
  });
});

test.describe('2. Tutoring Marketplace (Direct-to-Parent Network) Security Boundaries', () => {
  test('Strict Role Gating: completely hidden from Players, Admins, and Commissioners', async ({ page }) => {
    const restrictedRoles = ['player', 'admin', 'commissioner'];

    for (const role of restrictedRoles) {
      await page.addInitScript((mockRole) => {
        window.localStorage.setItem('firebase_auth_mock', JSON.stringify({
          uid: `test-${mockRole}-uid`,
          claims: { role: mockRole }
        }));
      }, role);

      // Attempt to access the tutoring marketplace
      await page.goto('/parent/marketplace');
      
      // Zero-Trust redirect: should instantly kick restricted roles back to their dashboards
      await expect(page).not.toHaveURL('/parent/marketplace');
    }
  });

  test('Permitted Roles: access granted exclusively to Parents, Coaches, and Directors', async ({ page }) => {
    const permittedRoles = ['parent', 'coach', 'director'];

    for (const role of permittedRoles) {
      await page.addInitScript((mockRole) => {
        window.localStorage.setItem('firebase_auth_mock', JSON.stringify({
          uid: `test-${mockRole}-uid`,
          claims: { role: mockRole, clubId: 'aggiesfc' }
        }));
      }, role);

      await page.goto('/parent/marketplace');
      // Assert marketplace route successfully mounts its wrapper
      await expect(page.locator('.marketplace-arena')).toBeVisible();
    }
  });
});

test.describe('3. Multi-Billion-Dollar Cohesive Design System & Typography Engine', () => {
  test('Enforces Atompunk Color Taxonomy and 60-30-10 Palette rules', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('firebase_auth_mock', JSON.stringify({
        uid: 'test-director-uid',
        claims: { role: 'director', clubId: 'aggiesfc' }
      }));
    });

    await page.goto('/director/dashboard');

    // Assert Void Black Background canvas density (#000000 or #020617)
    const background = await page.locator('.app-shell').evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(background === 'rgb(0, 0, 0)' || background === 'rgb(2, 6, 23)').toBe(true);

    // Enforce ONE primary "Action Gold" Call-to-Action per viewport
    const goldCtas = page.locator('button.btn-primary-gold');
    const ctaCount = await goldCtas.count();
    expect(ctaCount).toBe(1);

    // Verify Geist Mono is applied to all data readouts and tables
    const tableHeaderFont = await page.locator('.universal-data-table').first().evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(tableHeaderFont).toContain('Geist Mono');
  });

  test('Enforces Persona-Specific Layouts (Flat Trust vs. Gaming HUD)', async ({ page }) => {
    // 1. Parent OS: Enforces calm trust aesthetic with exactly 24px border radii
    await page.addInitScript(() => {
      window.localStorage.setItem('firebase_auth_mock', JSON.stringify({
        uid: 'test-parent-uid',
        claims: { role: 'parent' }
      }));
    });
    await page.goto('/parent/dashboard');
    const parentPanelRadius = await page.locator('.parent-trust-panel').first().evaluate((el) => {
      return window.getComputedStyle(el).borderRadius;
    });
    expect(parentPanelRadius).toBe('24px');

    // 2. Player OS: Enforces aggressive 40% Void Black Gaming HUD and chamfered clip-paths
    await page.addInitScript(() => {
      window.localStorage.setItem('firebase_auth_mock', JSON.stringify({
        uid: 'test-player-uid',
        claims: { role: 'player' }
      }));
    });
    await page.goto('/player/dashboard');
    const playerCardClipPath = await page.locator('.player-gamified-card').first().evaluate((el) => {
      return window.getComputedStyle(el).clipPath;
    });
    expect(playerCardClipPath).toContain('polygon');
  });
});
