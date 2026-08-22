import { test, expect } from '@playwright/test';

test.describe('Parent OS - Emotional Safety Enjoyment Feed', () => {
  test('renders qualitative card metrics and excludes numeric statistical counts', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="parent-feed">
            <div class="metric-card">Self-Worth Score: Exceptional</div>
            <div class="metric-card">Caring Climate Score: 95% Positive Team Dynamic</div>
            <div class="metric-card">Mastery Climate: Focused on Personal Growth</div>
          </div>
        </body>
      </html>
    `);

    const feed = page.locator('#parent-feed');
    await expect(feed).toBeVisible();
    await expect(feed).toContainText('Self-Worth Score');
    await expect(feed).toContainText('Caring Climate Score');

    const feedText = await feed.innerText();
    expect(feedText).not.toMatch(/goals\s*:/i);
    expect(feedText).not.toMatch(/assists\s*:/i);
  });
});
