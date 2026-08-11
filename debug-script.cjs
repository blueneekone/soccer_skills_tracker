const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/player/dashboard');
  await page.evaluate(() => {
    window.localStorage.setItem('auth_state', JSON.stringify({
      uid: 'player-telemetry-uid',
      isAuthenticated: true,
      role: 'player',
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
  await page.screenshot({ path: 'player-dash-debug.png', fullPage: true });
  await browser.close();
})();
