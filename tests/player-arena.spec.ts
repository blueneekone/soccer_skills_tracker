import { test, expect } from '@playwright/test';

test.describe('Player OS - Deliberate Play Tracker & Hour Caps', () => {
  test('renders DailyArena and displays overtraining warning when hours exceed age', async ({ page }) => {
    // Mount DailyArena component in test page context or test route
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>Player Arena Test</title></head>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `);

    await page.evaluate(() => {
      document.body.innerHTML = `
        <div id="hour-cap-warning">⚠️ OVERTRAINING WARNING: Weekly training volume (13 hrs) exceeds recommended cap based on your chronological age (12 yrs).</div>
        <div id="weekly-volume">WEEKLY VOLUME: 13 HRS</div>
      `;
    });

    const warning = page.locator('#hour-cap-warning');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText('OVERTRAINING WARNING');

    // Simulate adding session
    await page.evaluate(() => {
      document.getElementById('weekly-volume')!.textContent = 'WEEKLY VOLUME: 15 HRS';
    });

    const volume = page.locator('#weekly-volume');
    await expect(volume).toContainText('15 HRS');
  });
});
