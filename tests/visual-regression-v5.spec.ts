import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Strict color taxonomy configuration (Solid & Translucent)
const DATA_CYAN_RGB = 'rgb(20, 184, 166)';       // #14b8a6 (Solid)
const DATA_CYAN_RGBA = 'rgba(20, 184, 166, 0.6)'; // #14b8a6 (Translucent Hover)
const ATOMPUNK_AMBER_RGB = 'rgb(245, 158, 11)';   // #f59e0b (Accent)
const ACTION_GOLD_RGB = 'rgb(251, 191, 36)';      // #fbbf24 (CTA Text)
const SOFT_CYAN_RGB = 'rgb(45, 217, 218)';        // #2dd9da (Parent Accent)
const SLATE_50_RGB = 'rgb(241, 245, 249)';         // #f1f5f9 (Muted Slate)

const COMPLIANT_HOVER_COLORS = [
  DATA_CYAN_RGB,
  DATA_CYAN_RGBA,
  ATOMPUNK_AMBER_RGB,
  ACTION_GOLD_RGB,
  SOFT_CYAN_RGB,
  SLATE_50_RGB
];

const PERSONAS = {
  admin: {
    uid: 'admin-telemetry-uid',
    role: 'super_admin',
    clubId: 'aggiesfc',
    routes: [
      { name: 'overview', path: '/admin/overview', waitSelector: '.tenant-matrix-grid' },
      { name: 'users', path: '/admin/users', waitSelector: '.cc-root, .gu-root' },
      { name: 'organizations', path: '/admin/organizations', waitSelector: '.orgs-panel' },
      { name: 'audit-logs', path: '/admin/audit-log', waitSelector: '.al-page' },
      { name: 'settings', path: '/admin/system-settings', waitSelector: 'h1' }
    ]
  },
  player: {
    uid: 'player-telemetry-uid',
    role: 'player',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/player/dashboard', waitSelector: '.pd-page-root' },
      { name: 'skill-tree', path: '/player/skill-tree', waitSelector: '.pd-page-root, .st-bento' }
    ]
  },
  coach: {
    uid: 'coach-telemetry-uid',
    role: 'coach',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/coach/dashboard', waitSelector: '.coach-dashboard-root, .st-bento' },
      { name: 'logistics', path: '/coach/logistics', waitSelector: '.pd-page-root, .st-bento' },
      { name: 'daily-intel', path: '/coach/daily-intel', waitSelector: '.pd-page-root, .st-bento' },
      { name: 'war-room', path: '/coach/war-room', waitSelector: '.pd-page-root, .st-bento, .tactical-arena-canvas' }
    ]
  },
  parent: {
    uid: 'parent-telemetry-uid',
    role: 'parent',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/parent/dashboard', waitSelector: 'main, .parent-panel' },
      { name: 'household', path: '/parent/household', waitSelector: '.parent-lounge-page, .phh' },
      { name: 'trust-center', path: '/parent/trust-center', waitSelector: 'main' },
      { name: 'payments', path: '/parent/payments', waitSelector: '.pp-root' }
    ]
  },
  director: {
    uid: 'director-telemetry-uid',
    role: 'director',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/director/dashboard', waitSelector: '.director-console-page' }
    ]
  },
  commissioner: {
    uid: 'commissioner-telemetry-uid',
    role: 'commissioner',
    clubId: 'aggiesfc',
    routes: [
      { name: 'matrix', path: '/commissioner/matrix', waitSelector: '.federation-matrix-grid' }
    ]
  },
  public: {
    uid: 'public-telemetry-uid',
    role: 'public',
    clubId: 'aggiesfc',
    routes: [
      { name: 'club-roster', path: '/club/aggiesfc', waitSelector: '.clp-root' }
    ]
  }
};

/**
 * Programmatic visual inspection assertions for 2D bounding boxes and CSS.
 */
async function runMicroscopicLayoutAssertions(page: any, routeName: string) {
  // 1. Assert No Horizontal Scroll Overflow
  const overflowX = await page.evaluate(() => window.scrollX);
  expect(overflowX).toBe(0);

  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  // 2. Bento Grid 2D Collision Check (Ensure no layout overlapping coordinates)
  const gridChildren = page.locator('.tw-grid > *, .st-bento > *, [class*="Bento"] > *');
  const count = await gridChildren.count();
  const bboxes = [];
  for (let i = 0; i < count; i++) {
    const box = await gridChildren.nth(i).boundingBox();
    if (box) {
      bboxes.push({ id: i, ...box });
    }
  }

  for (let i = 0; i < bboxes.length; i++) {
    for (let j = i + 1; j < bboxes.length; j++) {
      const a = bboxes[i];
      const b = bboxes[j];
      const overlapX = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
      const overlapY = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
      if (overlapX > 1 && overlapY > 1) {
        const classA = await gridChildren.nth(i).evaluate(el => el.className);
        const classB = await gridChildren.nth(j).evaluate(el => el.className);
        throw new Error(`[COLLISION DETECTED] Element ${a.id} (${classA}) overlaps Element ${b.id} (${classB}) on route: ${routeName}`);
      }
    }
  }

  // 3. Text Truncation / Clipping Checks
  const clips = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('.tw-font-mono, h1, h2, h3, p'));
    return elements.some(el => el.scrollWidth > el.clientWidth && window.getComputedStyle(el).overflow === 'hidden');
  });
  if (clips) {
    console.warn(`[WARNING] Silent text clipping/truncation observed on route: ${routeName}`);
  }
}

/**
 * Interactive hover and tooltip assertions with kinetic delay handling.
 */
async function verifyInteractiveHoverState(page: any, selector: string) {
  const elements = page.locator(selector);
  const count = await elements.count();
  if (count > 0) {
    const targetElement = elements.first();
    await targetElement.scrollIntoViewIfNeeded();
    await targetElement.hover();
    
    // Wait for the mandated 150-250ms kinetic transition window
    await page.waitForTimeout(250);

    // Verify visual color transition shifts cleanly to a compliant accent
    const computedColor = await targetElement.evaluate((el: any) => window.getComputedStyle(el).color);
    expect(COMPLIANT_HOVER_COLORS).toContain(computedColor);
  }
}

// Ensure the local screenshots folder exists securely
const artifactsDir = join(process.cwd(), 'audit-artifacts');
if (!existsSync(artifactsDir)) {
  mkdirSync(artifactsDir, { recursive: true });
}

// Generate sequential traversal specs for each persona
for (const [personaName, persona] of Object.entries(PERSONAS)) {
  test.describe(`EPIC COMPREHENSIVE TRAVERSAL: ${personaName.toUpperCase()} OS`, () => {
    
    test.beforeEach(async ({ page }) => {
      page.on('console', msg => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
      page.on('pageerror', err => console.error(`[Browser Error] ${err.name}: ${err.message}`, err.stack));

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
        // Set both localStorage (for hydrateForE2E sync path) and
        // window.__TEST_PROFILE__ (for VITE_E2E_BYPASS_AUTH async path)
        window.localStorage.setItem('auth_state', JSON.stringify(profile));
        (window as any).__TEST_PROFILE__ = profile;
      }, persona);
    });

    for (const route of persona.routes) {
      test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
        // Create isolated folders for each target review segment
        const personaDir = join(artifactsDir, personaName);
        if (!existsSync(personaDir)) {
          mkdirSync(personaDir, { recursive: true });
        }

        // 1. Navigate directly to the target route using fast load gating (bypass gRPC networkidle lock)
        await page.goto(route.path, { waitUntil: 'load' });

        // 2. Wait explicitly for the Svelte 5 DOM and page elements to hydrate
        await page.waitForSelector(route.waitSelector, { state: 'visible', timeout: 10000 });
        await page.waitForTimeout(300); // Allow reactivity and animations to settle

        // 3. Assert no unstyled light-mode flash exists (Void Black/Navy Slate only)
        const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        expect(bg).not.toBe('rgb(255, 255, 255)');

        // 4. Run coordinate box layout overlap calculations
        await runMicroscopicLayoutAssertions(page, route.name);

        // 5. Perform active hover style validation against brand links
        await verifyInteractiveHoverState(page, '.vanguard-link, .pd-nav-link, .st-bento a:not(.quest-hero__cta)');

        // 6. Deposit visual proof screenshot directly into audit-artifacts/
        const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
      });
    }
  });
}
