import { test, expect } from '@playwright/test';

/**
 * SSTracker "Atomic Noir" Microscopic Visual & Layout Testing Suite
 * Strictly enforces:
 * - 60-30-10 color taxonomy: Void Black (#000000), Navy Slate (#0f172a / #1e293b), Data Cyan (#14b8a6)
 * - Microscopic padding checks: minimum 24px (1.5rem) on desktop, 16px (1rem) on mobile
 * - Standardized typography: Geist Sans (headers), Switzer (body), Geist Mono (data and telemetry)
 * - Single-CTA rule: Exactly one Action Gold (#fbbf24) primary CTA per viewport
 * - Persona specific layouts: 90deg square corners (Admin/Coach/Director), 24px rounded (Parent), chamfered (Player)
 * - Asymmetric 12-column Bento Grid fluid clamping
 */

// Viewport profiles matching standard 16:9 widescreen and responsive breakpoints
const viewports = {
    desktop: { width: 1280, height: 720 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
};

// Helper function to inject authentication JWT into localStorage for unblocked testing
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
            clubId: 'mock-club-123'
        }));
    }, { role, uid });
}

// Global Microscopic Auditing Utilities
const auditors = {
    // 1. Verify that no text element hugs the container boundary
    async assertEdgePadding(page, containerSelector, minPaddingDesktop = 24, minPaddingMobile = 16) {
        const containers = page.locator(containerSelector);
        const count = await containers.count();

        for (let i = 0; i < count; i++) {
            const element = containers.nth(i);
            const padding = await element.evaluate((el) => {
                const style = window.getComputedStyle(el);
                return {
                    left: parseFloat(style.paddingLeft),
                    right: parseFloat(style.paddingRight),
                    top: parseFloat(style.paddingTop),
                    bottom: parseFloat(style.paddingBottom)
                };
            });

            const isMobile = page.viewportSize()?.width < 768;
            const minRequired = isMobile ? minPaddingMobile : minPaddingDesktop;

            expect(padding.left).toBeGreaterThanOrEqual(minRequired);
            expect(padding.right).toBeGreaterThanOrEqual(minRequired);
        }
    },

    // 2. Audit copy grammar, font family, and period placement
    async assertTypographyAndGrammar(page) {
        // Audit Headers
        const headers = page.locator('h1, h2, h3, h4, h5');
        const headerCount = await headers.count();
        for (let i = 0; i < headerCount; i++) {
            const header = headers.nth(i);
            const computed = await header.evaluate((el) => {
                const style = window.getComputedStyle(el);
                return {
                    fontFamily: style.fontFamily,
                    textTransform: style.textTransform
                };
            });
            // Headers should use Geist Sans font family
            expect(computed.fontFamily.toLowerCase()).toContain('geist');
        }

        // Audit Telemetry / Numbers (must use Geist Mono)
        const telemetryElements = page.locator('.telemetry-data, .font-mono, [data-telemetry]');
        const telemetryCount = await telemetryElements.count();
        for (let i = 0; i < telemetryCount; i++) {
            const element = telemetryElements.nth(i);
            const fontFamily = await element.evaluate((el) => window.getComputedStyle(el).fontFamily);
            expect(fontFamily.toLowerCase()).toContain('mono');
        }

        // Audit CTA labels for trailing periods (Prohibited on CTAs)
        const ctas = page.locator('button, .btn, .cta-button');
        const ctaCount = await ctas.count();
        for (let i = 0; i < ctaCount; i++) {
            const text = await ctas.nth(i).innerText();
            expect(text.trim().endsWith('.')).toBe(false);
        }
    },

    // 3. Enforce strict Nuclear Americana color rules
    async assertColorContrast(page, cardSelector) {
        const pageBg = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
        // Main canvas MUST resolve to pure Void Black
        expect(pageBg === 'rgb(0, 0, 0)' || pageBg === '#000000' || pageBg === 'black').toBe(true);

        const cards = page.locator(cardSelector);
        const count = await cards.count();
        if (count > 0) {
            const cardBg = await cards.first().evaluate((el) => window.getComputedStyle(el).backgroundColor);
            // Cards/Panels must be in the Navy Slate spectrum
            expect(cardBg).toMatch(/rgb\((15|30), (23|41), (42|59)\)/); // matches #0f172a or #1e293b
        }
    },

    // 4. Assert exactly one active primary Action Gold CTA in the viewport
    async assertSingleCTA(page) {
        const goldCtas = page.locator('button.bg-gold, .btn-primary, [data-primary-cta]');
        const count = await goldCtas.count();

        let visibleGoldCount = 0;
        for (let i = 0; i < count; i++) {
            if (await goldCtas.nth(i).isVisible()) {
                visibleGoldCount++;
            }
        }
        expect(visibleGoldCount).toBe(1);
    }
};

test.describe('SSTracker Landing Page Visual Audit', () => {
    test.beforeEach(async ({ page }) => {
        // Landing page is static and unauthenticated
        await page.goto('/');
    });

    test('Desktop View - 12-Column Asymmetric Bento Grid', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);

        // Validate Headline
        const headline = page.locator('h1');
        await expect(headline).toHaveText(/Stop managing teams. Start developing athletes. The Youth Sports OS./i);

        // Verify 6-4-2 Asymmetric Layout Column Spans
        const playerCard = page.locator('[data-bento="player"]');
        const coachCard = page.locator('[data-bento="coach"]');
        const parentCard = page.locator('[data-bento="parent"]');

        await expect(playerCard).toHaveClass(/col-span-6|lg:col-span-6/);
        await expect(coachCard).toHaveClass(/col-span-4|lg:col-span-4/);
        await expect(parentCard).toHaveClass(/col-span-2|lg:col-span-2/);

        // Run Microscopic Audits
        await auditors.assertEdgePadding(page, '.bento-well', 24, 16);
        await auditors.assertTypographyAndGrammar(page);
        await auditors.assertColorContrast(page, '.bento-well');
        await auditors.assertSingleCTA(page);

        // Deposit Verification Evidence
        await page.screenshot({ path: 'audit-artifacts/public/desktop-landing.png', fullPage: true });
    });

    test('Mobile View - Fluid Single-Column Collapse', async ({ page }) => {
        await page.setViewportSize(viewports.mobile);

        // Bento wells should stack vertically in a single column
        const playerCard = page.locator('[data-bento="player"]');
        const bounding = await playerCard.boundingBox();
        const viewportWidth = viewports.mobile.width;

        if (bounding) {
            expect(bounding.width).toBeLessThanOrEqual(viewportWidth);
        }

        // Mobile specific padding check
        await auditors.assertEdgePadding(page, '.bento-well', 24, 16);
        await page.screenshot({ path: 'audit-artifacts/public/mobile-landing.png' });
    });
});

test.describe('Global Admin OS Dashboard Audit', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'admin', 'mock-admin-uid');
        await page.goto('/admin/overview');
    });

    test('Microscopic Style & Technical Mainboard Check', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);

        // Enforce 90-degree square corners on panel card borders
        const panels = page.locator('.admin-panel, [data-panel]');
        const count = await panels.count();
        for (let i = 0; i < count; i++) {
            const borderRadius = await panels.nth(i).evaluate((el) => window.getComputedStyle(el).borderRadius);
            expect(borderRadius).toBe('0px');
        }

        // Verify Monospace Font Scaling on KPIs
        const metricLabels = page.locator('.kpi-metric-val');
        const countMetrics = await metricLabels.count();
        for (let i = 0; i < countMetrics; i++) {
            const fontFamily = await metricLabels.nth(i).evaluate((el) => window.getComputedStyle(el).fontFamily);
            expect(fontFamily.toLowerCase()).toContain('mono');
        }

        await auditors.assertEdgePadding(page, '.admin-panel', 24, 16);
        await page.screenshot({ path: 'audit-artifacts/admin/desktop-overview.png' });
    });
});

test.describe('Director OS Dashboard Audit', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'director', 'mock-director-uid');
        await page.goto('/director/dashboard');
    });

    test('Revenue Matrices & SafeSport Compliance Checks', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);

        // Validate 90deg Square Corners for B2B gravity
        const dashboardCards = page.locator('.director-card, [data-card]');
        const firstCardRadius = await dashboardCards.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
        expect(firstCardRadius).toBe('0px');

        // Verify presence of Stripe Connect details & Red/Amber/Green indicators
        const statusDots = page.locator('.compliance-status-dot');
        await expect(statusDots.first()).toBeVisible();

        // Confirm typography rules
        await auditors.assertTypographyAndGrammar(page);
        await page.screenshot({ path: 'audit-artifacts/director/desktop-dashboard.png' });
    });
});

test.describe('Coach OS Tactical SIEM Audit', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'coach', 'mock-coach-uid');
        await page.goto('/coach/war-room');
    });

    test('The Tron War Room SVG Coordinate Engine Check', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);

        // Verify strict 90deg square corners for tactical command view
        const tacticalHUD = page.locator('.tactical-hud-panel');
        const hudRadius = await tacticalHUD.evaluate((el) => window.getComputedStyle(el).borderRadius);
        expect(hudRadius).toBe('0px');

        // Confirm that absolutely NO Action Gold CTAs exist in the tactical console
        const goldButtons = page.locator('button.bg-gold, .btn-primary');
        const count = await goldButtons.count();
        let visibleGold = 0;
        for (let i = 0; i < count; i++) {
            if (await goldButtons.nth(i).isVisible()) {
                visibleGold++;
            }
        }
        expect(visibleGold).toBe(0);

        // Verify SVG Tactical Canvas and coordinate system bindings
        const tacticalPitch = page.locator('svg.tactical-pitch-canvas');
        await expect(tacticalPitch).toBeVisible();

        await page.screenshot({ path: 'audit-artifacts/coach/desktop-war-room.png' });
    });
});

test.describe('Player OS Gamified HUD Audit', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'player', 'mock-player-uid');
        await page.goto('/player/dashboard');
    });

    test('Widescreen TCG Player Card & Vanguard Prism Rendering', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);

        // Enforce aggressive chamfered clip-paths on cards
        const specialtyCards = page.locator('.chamfered-card, [data-chamfer]');
        const clipPath = await specialtyCards.first().evaluate((el) => window.getComputedStyle(el).clipPath);
        expect(clipPath).toContain('polygon');

        // Verify the SVG-based 6-axis Vanguard Prism radar chart is present
        const vanguardPrism = page.locator('svg.vanguard-prism-radar');
        await expect(vanguardPrism).toBeVisible();

        // Verify exactly ONE glowing Action Gold CTA per viewport
        await auditors.assertSingleCTA(page);

        await page.screenshot({ path: 'audit-artifacts/player/desktop-dashboard.png' });
    });
});

test.describe('Parent OS Compliance Shield Audit', () => {
    test.beforeEach(async ({ page }) => {
        await bypassRouteGuards(page, 'parent', 'mock-parent-uid');
        await page.goto('/parent/dashboard');
    });

    test('Trust-Oriented Rounding & Car Ride Home Embargo Protocol', async ({ page }) => {
        await page.setViewportSize(viewports.desktop);

        // Enforce friendly, trust-building 24px rounded corners
        const compliancePanels = page.locator('.parent-panel, [data-panel]');
        const panelRadius = await compliancePanels.first().evaluate((el) => window.getComputedStyle(el).borderRadius);
        expect(panelRadius).toBe('24px');

        // Verify the Car Ride Home countdown timer is rendered active
        const countdownTimer = page.locator('.car-ride-home-timer');
        await expect(countdownTimer).toBeVisible();

        // Verify the countdown contains appropriate time increments
        const timerText = await countdownTimer.innerText();
        expect(timerText).toMatch(/\d{2}:\d{2}/);

        await page.screenshot({ path: 'audit-artifacts/parent/desktop-dashboard.png' });
    });
});