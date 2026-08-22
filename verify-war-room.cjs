const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

async function recordWarRoomVerification() {
  const outputDir = path.join(__dirname, 'verification-media');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // 1. Bypass auth with mock claims
  const mockClaims = {
    uid: 'coach-tactical-strategist',
    email: 'missy.price@sstracker.app',
    role: 'coach',
    isCleared: true,
    isProfileComplete: true
  };

  await page.addInitScript((claims) => {
    window.localStorage.setItem('user_session_claims', JSON.stringify(claims));
    window.localStorage.setItem('sstracker_e2e_bypass', 'true');
  }, mockClaims);

  console.log('Navigating to /coach/tactical...');
  await page.goto('http://localhost:5173/coach/tactical', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Screenshot 1: Canvas mounted with Active Roster Sidebar
  await page.screenshot({ path: path.join(outputDir, '01-war-room-mounted.png') });
  console.log('Saved 01-war-room-mounted.png');

  // 2. Open HUD Help console
  const hudHelpBtn = page.locator('button:has-text("[ HUD_HELP ]")');
  if (await hudHelpBtn.isVisible()) {
    await hudHelpBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '02-hud-help-open.png') });
    console.log('Saved 02-hud-help-open.png');
  }

  // 3. Trigger System Diagnostic from Help console
  const diagnosticBtn = page.locator('button:has-text("[ SYSTEM_DIAGNOSTIC: INJECT_PATH_DEVIATION ]")');
  if (await diagnosticBtn.isVisible()) {
    await diagnosticBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, '03-diagnostic-reset-prompt.png') });
    console.log('Saved 03-diagnostic-reset-prompt.png');

    // Click Reset
    const resetBtn = page.locator('button:has-text("[ RESET DRILL ]")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // Close Help console
  const closeHelpBtn = page.locator('.hud-help-sliding-console button:has-text("✕")');
  if (await closeHelpBtn.isVisible()) {
    await closeHelpBtn.click();
    await page.waitForTimeout(500);
  }

  // 4. Test Deploy Opponent Token with position acronym (CDM)
  const opDeployBtn = page.locator('button:has-text("OP DEPLOY")');
  if (await opDeployBtn.isVisible()) {
    await opDeployBtn.click();
  }

  const posSelect = page.locator('select.position-deploy-selector');
  if (await posSelect.isVisible()) {
    await posSelect.selectOption('CDM');
  }

  // Click on pitch canvas to deploy opponent
  const pitchCanvas = page.locator('svg.tactical-pitch-canvas');
  if (await pitchCanvas.isVisible()) {
    const box = await pitchCanvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(outputDir, '04-opponent-cdm-deployed.png') });
      console.log('Saved 04-opponent-cdm-deployed.png');
    }
  }

  // 5. Test Drawing PLAYER RUN and BALL PASS
  const playerRunBtn = page.locator('button:has-text("PLAYER RUN")');
  if (await playerRunBtn.isVisible()) {
    await playerRunBtn.click();
    const box = await pitchCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  const ballPassBtn = page.locator('button:has-text("BALL PASS")');
  if (await ballPassBtn.isVisible()) {
    await ballPassBtn.click();
    const box = await pitchCanvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.6, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: path.join(outputDir, '05-vector-routes-drawn.png') });
  console.log('Saved 05-vector-routes-drawn.png');

  await page.close();
  await context.close();
  await browser.close();

  console.log('Verification completed! Media generated in:', outputDir);
}

recordWarRoomVerification().catch(console.error);
