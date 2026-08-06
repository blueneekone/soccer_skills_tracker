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

  await page.goto('http://localhost:5173/coach/logistics');
  
  // Wait a few seconds for hydration
  await page.waitForTimeout(4000);
  
  console.log("Checking UI state...");
  const bodyText = await page.innerText('body');
  if (bodyText.includes('Loading teams')) {
    console.log("UI STATE: Found 'Loading teams' text.");
  } else if (bodyText.includes('No team assigned')) {
    console.log("UI STATE: Found 'No team assigned' text.");
  } else {
    console.log("UI STATE: Teams loaded successfully.");
  }
  
  await browser.close();
})();
