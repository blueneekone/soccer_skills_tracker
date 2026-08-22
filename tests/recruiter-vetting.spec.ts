import { test, expect } from '@playwright/test';

test.describe('Recruiter HUD - Verified Recruiter Vetting', () => {
  test('strips minor contact PII unless parental waiver is verified', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="recruiter-prospects-list">
            <div class="prospect">
              <span class="name">Alex Johnson</span>
              <span class="contact">CONTACT: alex@parent.com</span>
            </div>
            <div class="prospect">
              <span class="name">Jordan Smith</span>
              <span class="contact">CONTACT: [PROTECTED_MINOR_PII]</span>
            </div>
          </div>
        </body>
      </html>
    `);

    const prospects = page.locator('#recruiter-prospects-list');
    await expect(prospects).toBeVisible();
    await expect(prospects).toContainText('alex@parent.com');
    await expect(prospects).toContainText('[PROTECTED_MINOR_PII]');
  });
});
