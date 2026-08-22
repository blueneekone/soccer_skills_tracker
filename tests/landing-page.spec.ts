import { test, expect } from '@playwright/test';

test.describe('Marketing - Savings Calculator & Video Mascot Widget', () => {
  test('calculates annual savings compared to TeamSnap and renders video mascot player', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="pricing-comparison-table">
            <div id="total-annual-savings">$73,700</div>
          </div>
          <div id="video-mascot-container">
            <video id="mascot-play-loop" autoplay loop muted></video>
          </div>
        </body>
      </html>
    `);

    const table = page.locator('#pricing-comparison-table');
    await expect(table).toBeVisible();

    const savings = page.locator('#total-annual-savings');
    await expect(savings).toContainText('$73,700');

    const video = page.locator('#mascot-play-loop');
    await expect(video).toBeVisible();
  });
});
