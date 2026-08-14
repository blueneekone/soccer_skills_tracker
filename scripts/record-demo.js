/**
 * SSTracker Automated High-Fidelity Video Capture Engine
 * Captures pixel-perfect 1080p 60fps diegetic recordings matching the public website video slots.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../static/videos');
const RAW_DIR = path.resolve(__dirname, '../recordings');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

/**
 * Smooth natural cursor interpolation for cinematic interaction feel
 */
async function smoothMouseMove(page, startX, startY, endX, endY, steps = 25) {
  for (let i = 0; i <= steps; i++) {
    const x = startX + (endX - startX) * (i / steps);
    const y = startY + (endY - startY) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(16); // ~60fps step
  }
}

/**
 * Authenticate session via test profile / token bypass
 */
async function setupContext(browser, role, profile = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  
  // Inject mock user state for immediate hydration without redirect barriers
  await page.addInitScript(({ role, profile }) => {
    window.localStorage.setItem('sstracker_e2e_bypass', 'true');
    window.localStorage.setItem('sstracker_mock_role', role);
    window.localStorage.setItem('sstracker_mock_profile', JSON.stringify({
      role,
      isProfileComplete: true,
      playerName: profile.playerName || 'Alex Vance',
      clubId: profile.clubId || 'apex-academy',
      teamId: profile.teamId || 'u17-premier',
      ...profile
    }));
  }, { role, profile });

  return { context, page };
}

/**
 * Move and copy finalized video to target destination
 */
async function finalizeVideo(page, context, targetFilename) {
  await page.waitForTimeout(1000);
  const video = page.video();
  await context.close();
  
  if (video) {
    const rawPath = await video.path();
    const targetPath = path.join(OUTPUT_DIR, targetFilename);
    fs.copyFileSync(rawPath, targetPath);
    console.log(`[Video Pipeline] Successfully exported: ${targetFilename}`);
  }
}

async function captureDirectorDemo(browser) {
  console.log('Capturing: director-os-demo.webm...');
  const { context, page } = await setupContext(browser, 'director', {
    playerName: 'Marcus Sterling',
    clubId: 'apex-fc'
  });

  await page.goto(`${BASE_URL}/director/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Smooth hover over Mission Control KPI meters
  await smoothMouseMove(page, 400, 300, 750, 300, 30);
  await page.waitForTimeout(1200);

  // Hover on Registration Roster grid
  await smoothMouseMove(page, 750, 300, 960, 550, 30);
  await page.waitForTimeout(1500);

  // Smooth scroll down to Revenue & Facility Telemetry
  await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  await finalizeVideo(page, context, 'director-os-demo.webm');
}

async function captureCoachDemo(browser) {
  console.log('Capturing: coach-os-demo.webm...');
  const { context, page } = await setupContext(browser, 'coach', {
    playerName: 'Coach Henderson',
    clubId: 'apex-fc',
    teamId: 'u17-premier'
  });

  await page.goto(`${BASE_URL}/coach/tactical`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Interact with Tactical War Room pitch
  await smoothMouseMove(page, 500, 400, 850, 450, 35);
  await page.waitForTimeout(1000);

  // Smooth hover to Drill Designer panel
  await smoothMouseMove(page, 850, 450, 1400, 380, 30);
  await page.waitForTimeout(1500);

  // Scroll down to roster readiness cards
  await page.evaluate(() => window.scrollTo({ top: 350, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  await finalizeVideo(page, context, 'coach-os-demo.webm');
}

async function capturePlayerDemo(browser) {
  console.log('Capturing: player-os-demo.webm...');
  const { context, page } = await setupContext(browser, 'player', {
    playerName: 'Leo Hernandez',
    clubId: 'apex-fc',
    teamId: 'u17-premier',
    xp: 4850,
    currentStreak: 14
  });

  await page.goto(`${BASE_URL}/player/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Hover over Vanguard Prism 6-axis Radar
  await smoothMouseMove(page, 450, 450, 600, 420, 30);
  await page.waitForTimeout(1500);

  // Hover to XP streak progress bar
  await smoothMouseMove(page, 600, 420, 1100, 320, 30);
  await page.waitForTimeout(1200);

  // Smooth scroll down to Armory Loadout & Bounty Board
  await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  await finalizeVideo(page, context, 'player-os-demo.webm');
}

async function capturePlayerCvDemo(browser) {
  console.log('Capturing: player-cv-demo.webm...');
  const { context, page } = await setupContext(browser, 'player', {
    playerName: 'Leo Hernandez'
  });

  await page.goto(`${BASE_URL}/player/proving-grounds`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Hover over CV Trial verification workspace
  await smoothMouseMove(page, 500, 350, 960, 450, 30);
  await page.waitForTimeout(2000);

  await finalizeVideo(page, context, 'player-cv-demo.webm');
}

async function captureParentDemo(browser) {
  console.log('Capturing: parent-os-demo.webm...');
  const { context, page } = await setupContext(browser, 'parent', {
    playerName: 'Elena Hernandez',
    clubId: 'apex-fc',
    householdId: 'hh-hernandez-01'
  });

  await page.goto(`${BASE_URL}/parent/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Hover over Compliance Shield & Car Ride Home countdown
  await smoothMouseMove(page, 450, 320, 850, 350, 30);
  await page.waitForTimeout(1500);

  // Scroll down to Household Roster & Payment Ledgers
  await page.evaluate(() => window.scrollTo({ top: 380, behavior: 'smooth' }));
  await page.waitForTimeout(2000);

  await finalizeVideo(page, context, 'parent-os-demo.webm');
}

async function captureMarketingHeroDemo(browser) {
  console.log('Capturing: marketing-hero.webm (Master Compilation)...');
  const { context, page } = await setupContext(browser, 'guest', {});

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Cinematic pan over Landing Hero CTA
  await smoothMouseMove(page, 300, 400, 800, 520, 40);
  await page.waitForTimeout(1200);

  // Smooth scroll to Feature Bento
  await page.evaluate(() => window.scrollTo({ top: 750, behavior: 'smooth' }));
  await page.waitForTimeout(2500);

  // Smooth scroll to Stakeholder Bento Cards
  await page.evaluate(() => window.scrollTo({ top: 1550, behavior: 'smooth' }));
  await page.waitForTimeout(2500);

  await finalizeVideo(page, context, 'marketing-hero.webm');
}

(async () => {
  console.log('🎬 Initiating SSTracker Studio Video Capture Suite...');
  const browser = await chromium.launch({ headless: true });

  try {
    await captureMarketingHeroDemo(browser);
    await captureDirectorDemo(browser);
    await captureCoachDemo(browser);
    await capturePlayerDemo(browser);
    await capturePlayerCvDemo(browser);
    await captureParentDemo(browser);
    console.log('✨ All 6 high-fidelity marketing video slots successfully captured!');
  } catch (err) {
    console.error('❌ Video capture failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();