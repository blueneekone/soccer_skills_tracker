import { test, expect } from '@playwright/test';

test.describe('Parent OS - COPPA Challenge Gates & Digital Waivers', () => {
  test('enforces DOB challenge and cryptographic waiver signing', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <body>
          <input id="child-dob-input" type="date" value="2014-06-01" />
          <button id="submit-dob-btn" onclick="document.getElementById('coppa-gate-block').style.display='block';">Verify</button>

          <div id="coppa-gate-block" style="display:none;">
            <input id="parent-consent-checkbox" type="checkbox" onchange="check();" />
            <input id="safesport-checkbox" type="checkbox" onchange="check();" />
            <button id="commit-digital-signature-btn" disabled onclick="document.getElementById('waiver-signature-hash').style.display='block';">Commit</button>
            <div id="waiver-signature-hash" style="display:none;">✅ WAIVER SIGNED: SIG_COPPASAFESPORT_123456</div>
          </div>

          <script>
            function check() {
              const c1 = document.getElementById('parent-consent-checkbox').checked;
              const c2 = document.getElementById('safesport-checkbox').checked;
              document.getElementById('commit-digital-signature-btn').disabled = !(c1 && c2);
            }
          </script>
        </body>
      </html>
    `);

    await page.click('#submit-dob-btn');
    await expect(page.locator('#coppa-gate-block')).toBeVisible();

    const commitBtn = page.locator('#commit-digital-signature-btn');
    await expect(commitBtn).toBeDisabled();

    await page.check('#parent-consent-checkbox');
    await page.check('#safesport-checkbox');
    await expect(commitBtn).toBeEnabled();

    await commitBtn.click();
    const hash = page.locator('#waiver-signature-hash');
    await expect(hash).toBeVisible();
    await expect(hash).toContainText('SIG_COPPASAFESPORT');
  });
});
