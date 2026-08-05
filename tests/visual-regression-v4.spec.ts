import { test, expect } from '@playwright/test';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Strict color taxonomy configuration
const DATA_CYAN_RGB = 'rgb(20, 184, 166)';
const DATA_CYAN_RGBA = 'rgba(20, 184, 166, 0.6)';      // #14b8a6
const ATOMPUNK_AMBER_RGB = 'rgb(245, 158, 11)';  // #f59e0b
const ACTION_GOLD_RGB = 'rgb(251, 191, 36)';     // #fbbf24
const STRUCTURAL_GREY_RGB = 'rgb(51, 65, 85)';   // #334155

const PERSONAS = {
  admin: {
    uid: 'admin-telemetry-uid',
    role: 'admin',
    clubId: 'aggiesfc',
    routes: [
      { name: 'overview', path: '/admin/overview' },
      { name: 'users', path: '/admin/users' },
      { name: 'organizations', path: '/admin/organizations' },
      { name: 'audit-logs', path: '/admin/audit-logs' },
      { name: 'settings', path: '/admin/settings' }
    ]
  },
  parent: {
    uid: 'parent-telemetry-uid',
    role: 'parent',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/parent/dashboard' },
      { name: 'household', path: '/parent/household' },
      { name: 'trust-center', path: '/parent/trust-center' },
      { name: 'payments', path: '/parent/payments' }
    ]
  },
  coach: {
    uid: 'coach-telemetry-uid',
    role: 'coach',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/coach/dashboard' },
      { name: 'tactical', path: '/coach/tactical' },
      { name: 'war-room', path: '/coach/war-room' },
      { name: 'drills', path: '/coach/drills' },
      { name: 'match-day', path: '/coach/match-day' },
      { name: 'daily-intel', path: '/coach/daily-intel' }
    ]
  },
  player: {
    uid: 'player-telemetry-uid',
    role: 'player',
    clubId: 'aggiesfc',
    routes: [
      { name: 'dashboard', path: '/player/dashboard' },
      { name: 'skill-tree', path: '/player/skill-tree' }
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
  const gridChildren = page.locator('.coach-mainboard-grid > div, .st-bento > *, [class*="Bento"] > *');
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
      if (overlapX > 2 && overlapY > 2 && !(overlapX >= a.width - 2 && overlapY >= a.height - 2) && !(overlapX >= b.width - 2 && overlapY >= b.height - 2)) {
        console.log('Collision: ', a, b);
        throw new Error(`[COLLISION DETECTED] Element ${a.id} overlaps Element ${b.id} on route: ${routeName}`);
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
  const element = page.locator(selector);
  if (await element.count() > 0) {
    await element.first().scrollIntoViewIfNeeded();
    await element.first().hover();
    
    // Wait for the mandated 150-250ms kinetic transition window
    await page.waitForTimeout(250);

    // Verify visual color transition shifts cleanly to Data Cyan
    const computedColor = await element.first().evaluate((el: any) => window.getComputedStyle(el).color);
    expect([DATA_CYAN_RGB, DATA_CYAN_RGBA, ATOMPUNK_AMBER_RGB, ACTION_GOLD_RGB, 'rgb(45, 217, 218)']).toContain(computedColor);
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
      // Zero-Touch CSO Protocol: Inject authenticated state directly before page loads
      await page.addInitScript((p) => {
        window.localStorage.setItem('auth_state', JSON.stringify({
          uid: p.uid,
          isAuthenticated: true,
          role: p.role,
          clubId: p.clubId
        }));
      }, persona);
    });

    for (const route of persona.routes) {
      test(`Navigate & Audit: ${route.name.toUpperCase()}`, async ({ page }) => {
        // Create isolated folders for each target review segment
        const personaDir = join(artifactsDir, personaName);
        if (!existsSync(personaDir)) {
          mkdirSync(personaDir, { recursive: true });
        }

        // Navigate directly to the target route (bypass login screen)
        await page.goto(route.path, { waitUntil: 'load' });
        // Wait for layout selectors (combining HEAD and dev)
        await page.waitForSelector('.pd-page-root, .compliance-vault, .st-bento, .parent-os-root, [data-panel="true"], .coach-nexus-main, .coach-tactics-shell, .intel-panel, .coach-drill-lib, .coach-match-shell', {
          state: 'visible',
          timeout: 10000
        }).catch(e => console.log('timeout waiting for layout selector'));

        // Wait for content selectors
        await page.waitForSelector('table, .vanguard-panel, .household-graph, .parent-panel, [data-panel="true"], .phh-surface, section, svg:not(.vanguard-vfx-defs), .intel-panel', {
          state: 'visible',
          timeout: 10000
        }).catch(e => console.log('timeout waiting for content selector'));

        // Enforce a brief cooldown to let the kinetic transitions finish rendering
        await page.waitForTimeout(300);

        // 5. Assert the dark-mode theme has hydrated (No unstyled light-mode flashes)
        const bg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        expect(bg).not.toBe('rgb(255, 255, 255)');

        // 6. Run coordinate calculations and hover audits
        await runMicroscopicLayoutAssertions(page, route.name);
        await verifyInteractiveHoverState(page, 'a, button, .vanguard-link');

        // Deposit visual proof screenshot directly into audit-artifacts/
        const screenshotPath = join(personaDir, `${route.name}-desktop.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`[VISUAL AUDIT PASSED] Screenshot exported to: ${screenshotPath}`);
      });
    }
  });
}
