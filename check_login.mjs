import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  await page.goto('http://localhost:5173/login');
  
  await page.waitForTimeout(2000);

  // We are going to simulate the local auth state by injecting the user into indexeddb
  // Or we can just log in using UI if we know the password.
  // Wait, I can just use a fake token or just observe the console since the user's browser is already having the issue.
  
  await browser.close();
})();
