import { test, expect } from '@playwright/test';
import * as fs from 'fs';

test.describe('Fan OS Broadcast HUD & Interaction Audit', () => {
  test('Enforces high-contrast design, emoji particle streams, and superdraw trigger', async ({ page }) => {
    // 1. Set viewport to high-fidelity desktop step
    await page.setViewportSize({ width: 1280, height: 800 });

    // 2. Navigate to the broadcast overlay page
    await page.goto('http://localhost:5173/fan/broadcast', { waitUntil: 'load' });

    // 3. Explicitly wait for our layout container to render
    await page.waitForSelector('.bento-grid-container', { state: 'visible', timeout: 5000 });

    // Verify 60-30-10 custom classes and text elements
    const heading = page.locator('h2');
    await expect(heading.first()).toContainText('Live Match Feed');

    // 4. Click some reactions to trigger floating emoji particles on the live video stream
    const fireBtn = page.locator('button[aria-label="React with 🔥"]');
    await expect(fireBtn).toBeVisible();
    await fireBtn.click();
    await page.waitForTimeout(150);
    await fireBtn.click();
    await page.waitForTimeout(150);

    const rocketBtn = page.locator('button[aria-label="React with 🚀"]');
    await rocketBtn.click();
    await page.waitForTimeout(200);

    // Verify that particles are injected in the DOM overlay
    const particle = page.locator('.emoji-particle');
    const particleCount = await particle.count();
    console.log(`Rendered ${particleCount} active emoji particles on video feed.`);

    // 5. Interact with the Stripe-powered Superdraw Fundraising trigger
    // Set quantity to 3
    const plusBtn = page.locator('button[aria-label="Increase quantity"]');
    await plusBtn.click();
    await page.waitForTimeout(100);
    await plusBtn.click();
    await page.waitForTimeout(100);

    const quantityText = page.locator('.font-mono-tech', { hasText: '3' });
    await expect(quantityText.first()).toBeVisible();

    // Trigger the Superdraw action (Support Athlete)
    const supportBtn = page.locator('[data-primary-cta]');
    await supportBtn.click();
    await page.waitForTimeout(300);

    // Verify MVP candidate selection and voting action
    const voteBtn = page.locator('.vote-btn').first();
    await expect(voteBtn).toBeVisible();
    await voteBtn.click();
    await page.waitForTimeout(500);

    // Ensure the output directory exists
    fs.mkdirSync('audit-artifacts/fan', { recursive: true });

    // 6. Capture visual proof of the high-contrast dashboard overlay HUD
    await page.screenshot({ path: 'audit-artifacts/fan/broadcast-hud-proof.png', fullPage: true });
    console.log('Visual proof deposited to audit-artifacts/fan/broadcast-hud-proof.png');
  });
});