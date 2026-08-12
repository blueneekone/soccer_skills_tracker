const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log("🎬 Initiating Playwright automated screen-recording pipeline...");
  const rawDir = path.join(process.cwd(), 'recordings');
  if (!fs.existsSync(rawDir)) fs.mkdirSync(rawDir);

  const browser = await chromium.launch({ headless: true });
  console.log("🚀 Browser instance compiled headlessly.");

  // Clip 1: Director OS Sequence
  const dirContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const dirPage = await dirContext.newPage();
  await dirPage.goto('http://localhost:5173/director/dashboard');
  console.log("👉 Segment 1 (Director OS): Navigated and rendered.");
  await dirPage.waitForTimeout(3000); // Record interactions
  await dirContext.close();

  // Clip 2: Player OS Sequence
  const playerContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const playerPage = await playerContext.newPage();
  await playerPage.goto('http://localhost:5173/player/dashboard');
  console.log("👉 Segment 2 (Player OS): Navigated and rendered.");
  await playerPage.waitForTimeout(4000); // Capture confetti and gamification
  await playerContext.close();

  // Clip 3: Fan OS Sequence
  const fanContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const fanPage = await fanContext.newPage();
  await fanPage.goto('http://localhost:5173/fan/broadcast');
  console.log("👉 Segment 3 (Fan OS): Navigated and rendered.");
  await fanPage.waitForTimeout(3000); // Live scoring matrix
  await fanContext.close();

  // Clip 4: Parent OS Sequence
  const parentContext = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const parentPage = await parentContext.newPage();
  await parentPage.goto('http://localhost:5173/parent/dashboard');
  console.log("👉 Segment 4 (Parent OS): Navigated and rendered.");
  await parentPage.waitForTimeout(4000); // SafeSport privacy check
  await parentContext.close();

  await browser.close();
  console.log("✅ Playwright recording contexts finalized. Segment logs ready.");
})();