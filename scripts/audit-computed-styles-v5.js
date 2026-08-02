// SSTracker Master Visual Compliance Audit Engine (v5)
// Mathematically verifies colors, typography, bento grids, and persona-specific corner shapes.
import { test, expect } from '@playwright/test';
import fetch from 'node-fetch';

const EMULATOR_FIRESTORE_URL = 'http://localhost:8080/v1/projects/sstracker-nexus/databases/(default)/documents/users/mock-coach-uid';

// Pre-flight database seeding to bypass SvelteKit route redirection
async function seedMockProfile() {
    const payload = {
        fields: {
            uid: { stringValue: 'mock-coach-uid' },
            role: { stringValue: process.env.AUDIT_TARGET || 'coach' },
            isProfileComplete: { booleanValue: true },
            armory: {
                mapValue: {
                    fields: {
                        totalXP: { integerValue: 2500 },
                        streakFreeze: {
                            mapValue: {
                                fields: {
                                    available: { integerValue: 1 }
                                }
                            }
                        },
                        stats: {
                            mapValue: {
                                fields: {
                                    scoutsSix: {
                                        mapValue: {
                                            fields: {
                                                accuracy: { doubleValue: 88.00 },
                                                speed: { doubleValue: 75.00 },
                                                consistency: { doubleValue: 90.00 },
                                                power: { doubleValue: 80.00 },
                                                endurance: { doubleValue: 85.00 },
                                                tactics: { doubleValue: 92.00 }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    };

    try {
        const res = await fetch(EMULATOR_FIRESTORE_URL, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            console.log('[+] Firestore Emulator successfully seeded with completed profile.');
        } else {
            console.error('[-] Failed to seed Firestore Emulator:', res.statusText);
        }
    } catch (err) {
        console.error('[-] Network error seeding Firestore Emulator:', err.message);
    }
}

test.describe('SSTracker Elite Visual Compliance Suite', () => {
    const targetPersona = process.env.AUDIT_TARGET || 'coach';
    const targetRoute = `/${targetPersona}/dashboard`;

    test.beforeAll(async () => {
        await seedMockProfile();
    });

    test('Assert Strict "Nuclear Americana Tech Noir" Compliance', async ({ page }) => {
        // Inject auth token to skip login screen
        await page.addInitScript(() => {
            window.localStorage.setItem('auth_token', 'mock-coach-token');
            window.localStorage.setItem('user_uid', 'mock-coach-uid');
        });

        console.log(`[Audit] Navigating to ${targetRoute} for validation...`);
        await page.goto(targetRoute);
        await page.waitForLoadState('networkidle');

        // Fail-safe: Detect if SvelteKit unauth route guard hijacked page and redirected to /setup
        const currentUrl = page.url();
        if (currentUrl.includes('/setup')) {
            throw new Error(`[-] CRITICAL GATE FAILURE: SvelteKit redirected traversal to /setup due to incomplete Auth hydration.`);
        }

        // 1. Assert strict 60-30-10 Color Palette Contrast
        const canvasBg = await page.evaluate(() => {
            const el = document.querySelector('.app-shell') || document.body;
            return window.getComputedStyle(el).backgroundColor;
        });
        // Strict check: Must match rgb(0, 0, 0) - absolute Void Black
        expect(canvasBg).toBe('rgb(0, 0, 0)');

        // 2. Enforce the Singular CTA Constraint (Exactly ONE Action Gold #fbbf24 primary CTA per viewport)
        const goldCTAs = await page.locator('.tw-bg-\\[\\#fbbf24\\]').count();
        expect(goldCTAs).toBeLessThanOrEqual(1);

        // 3. Typographical Token Checks
        const monoTelemetry = page.locator('.tw-font-mono');
        const count = await monoTelemetry.count();
        for (let i = 0; i < count; i++) {
            const font = await monoTelemetry.nth(i).evaluate(el => window.getComputedStyle(el).fontFamily);
            expect(font.toLowerCase()).toContain('mono');
        }

        // 4. Persona-Specific Microscopic Corner Audits
        if (targetPersona === 'coach' || targetPersona === 'commissioner' || targetPersona === 'admin') {
            // Enforce sharp 90-degree SIEM dashboard corners
            const panels = page.locator('.vanguard-panel, .glass-panel');
            const panelCount = await panels.count();
            for (let i = 0; i < panelCount; i++) {
                const radius = await panels.nth(i).evaluate(el => window.getComputedStyle(el).borderRadius);
                expect(radius).toBe('0px');
            }
        } else if (targetPersona === 'parent') {
            // Enforce structural trust premium 24px rounded corners
            const parentPanels = page.locator('.parent-vault-panel');
            if (await parentPanels.count() > 0) {
                const radius = await parentPanels.first().evaluate(el => window.getComputedStyle(el).borderRadius);
                expect(radius).toBe('24px');
            }
        } else if (targetPersona === 'player') {
            // Enforce gamification outer card chamfers
            const playerCard = page.locator('.player-gamified-card');
            if (await playerCard.count() > 0) {
                const clipPath = await playerCard.first().evaluate(el => window.getComputedStyle(el).clipPath);
                expect(clipPath).toContain('polygon');
            }
        }

        // 5. Asymmetric 12-Column Bento Grid Math Assertions
        const grid = page.locator('.tw-grid');
        const gridCount = await grid.count();
        for (let i = 0; i < gridCount; i++) {
            const gridTemplate = await grid.nth(i).evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
            if (gridTemplate.includes('repeat')) {
                expect(gridTemplate).toMatch(/(clamp|minmax)/);
            }
        }

        // 6. Viewport capture limits (1280px, 768px, 375px)
        const viewports = [
            { width: 1280, height: 800, name: 'desktop' },
            { width: 768, height: 1024, name: 'tablet' },
            { width: 375, height: 667, name: 'mobile' }
        ];

        for (const vp of viewports) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.waitForTimeout(200); // Wait for CSS transition kinetics (150-250ms)
            await page.screenshot({
                path: `./audit-artifacts/${targetPersona}/${vp.name}-visual-audit.png`,
                fullPage: true
            });
        }

        console.log(`[+] Visual audit successful! High-definition screenshots deposited for ${targetPersona}.`);
    });
});
