const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.goto('http://localhost:5173/parent/dashboard');

  // Inject auth state
  await page.evaluate(() => {
    window.localStorage.setItem('auth_state', JSON.stringify({
      uid: 'admin-telemetry-uid',
      isAuthenticated: true,
      role: 'parent',
      clubId: 'aggiesfc',
      isProfileComplete: true,
      isCleared: true,
      clearance: { status: 'cleared', checkrStatus: 'clear', safeSportStatus: 'certified' },
      vpcStatus: 'verified',
      isConsented: true
    }));
  });

  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'audit-artifacts/parent/dashboard-audit.png', fullPage: true });

  await page.goto('http://localhost:5173/parent/trust-center', { waitUntil: 'load' });
  await page.waitForTimeout(5000);

  await page.screenshot({ path: 'audit-artifacts/parent/trust-center-audit.png', fullPage: true });

  await browser.close();
})();
