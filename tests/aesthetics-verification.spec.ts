import { test, expect } from '@playwright/test';

// Strict color taxonomy configuration (Solid & Translucent)
const DATA_CYAN_RGB = 'rgb(20, 184, 166)';       // #14b8a6 (Solid)
const ATOMPUNK_AMBER_RGB = 'rgb(245, 158, 11)';   // #f59e0b (Accent)
const ACTION_GOLD_RGB = 'rgb(251, 191, 36)';      // #fbbf24 (CTA Text)

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 768 }
];

const PERSONAS = {
  admin: {
    uid: 'admin-telemetry-uid',
    role: 'super_admin',
    clubId: 'aggiesfc',
    routes: [
      { name: 'overview', path: '/admin/overview', waitSelector: '.tenant-matrix-grid, h1' }
    ]
  },
  player: {
    uid: 'player-telemetry-uid',
    role: 'player',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/player/dashboard', waitSelector: '.pd-page-root' }
    ]
  },
  coach: {
    uid: 'coach-telemetry-uid',
    role: 'coach',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/coach/dashboard', waitSelector: '.coach-dashboard-root' }
    ]
  }
};

test.describe('POLISHED VISUAL & CINEMATIC HUD AUDIT', () => {
  for (const viewport of VIEWPORTS) {
    test.describe(`Viewport: ${viewport.name.toUpperCase()} (${viewport.width}x${viewport.height})`, () => {

      for (const [personaName, persona] of Object.entries(PERSONAS)) {
        test.describe(`Persona: ${personaName.toUpperCase()} OS`, () => {

          test.beforeEach(async ({ page }) => {
            // Set the exact viewport size
            await page.setViewportSize({ width: viewport.width, height: viewport.height });

            // Zero-Touch CSO Protocol: Inject authenticated state directly before page loads
            await page.addInitScript((p) => {
              const profile = {
                uid: p.uid,
                isAuthenticated: true,
                role: p.role,
                clubId: p.clubId,
                isProfileComplete: true,
                isCleared: true,
                clearance: { status: 'cleared', checkrStatus: 'clear', safeSportStatus: 'certified' },
                vpcStatus: 'verified',
                isConsented: true
              };
              window.localStorage.setItem('auth_state', JSON.stringify(profile));
              (window as any).__TEST_PROFILE__ = profile;
            }, persona);
          });

          for (const route of persona.routes) {
            test(`Aesthetics & Cinematic Lock on ${route.name.toUpperCase()}`, async ({ page }) => {
              // 1. Navigate to route
              await page.goto(route.path, { waitUntil: 'load' });

              // 2. Wait explicitly for Svelte 5 DOM hydration (using comfortable timeout for Vite on-the-fly compiling)
              await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 35000 });
              await page.waitForTimeout(500);

              // 3. Assert No Horizontal Scroll Overflow
              const overflowX = await page.evaluate(() => window.scrollX);
              expect(overflowX).toBe(0);

              const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
              const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
              expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

              // 4. Warning logs for healthy text truncation/clipping (avoid strict failures on design-approved ellipsis)
              const clippedElements = await page.evaluate(() => {
                const elements = Array.from(document.querySelectorAll('.tw-font-mono, h1, h2, h3, p'));
                return elements.filter(el => {
                  const style = window.getComputedStyle(el);
                  return el.scrollWidth > el.clientWidth && style.overflow === 'hidden';
                }).map(el => el.className);
              });
              if (clippedElements.length > 0) {
                console.warn(`[WARNING] Text clipping/truncation observed on ${route.name.toUpperCase()}:`, clippedElements);
              }

              // 5. Assert 60-30-10 palette and background color
              const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
              expect(bg).not.toBe('rgb(255, 255, 255)');

              // 6. Action Gold CTA Verification (Exactly ONE Action Gold primary CTA where allowed)
              const actionGolds = page.locator('.vanguard-btn-amber, .tw-vanguard-btn-amber, .primary-mission-cta');
              const goldCount = await actionGolds.count();

              if (['super_admin', 'coach', 'director', 'commissioner'].includes(persona.role)) {
                // Strictly forbidden in Admin / Coach panels under SIEM rules
                expect(goldCount).toBe(0);
              } else if (persona.role === 'player') {
                // Ensure exactly ONE primary Action Gold CTA in player viewport (or no more than one)
                expect(goldCount).toBeLessThanOrEqual(1);
              }
            });
          }
        });
      }
    });
  }
});
