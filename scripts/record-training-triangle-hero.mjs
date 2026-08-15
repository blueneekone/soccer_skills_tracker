/**
 * SSTracker — The Training Triangle Master Video Recording Suite
 * Captures Coach OS (Tactical Intent) -> Player OS (Dopamine Engine) -> Parent OS (Compliance Shield)
 * Outputs pixel-perfect 1080p 60fps video to static/videos/marketing-hero.webm
 */

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.resolve(__dirname, '../static/videos');
const RAW_DIR = path.resolve(__dirname, '../recordings');
const ASSETS_VIDEO_DIR = path.resolve(__dirname, '../static/assets/video');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_VIDEO_DIR)) fs.mkdirSync(ASSETS_VIDEO_DIR, { recursive: true });

async function smoothMouseMove(page, startX, startY, endX, endY, steps = 30) {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Cubic ease-in-out curve
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const x = startX + (endX - startX) * ease;
    const y = startY + (endY - startY) * ease;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
}

async function smoothScroll(page, targetY, steps = 30) {
  const currentY = await page.evaluate(() => window.scrollY);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const y = currentY + (targetY - currentY) * ease;
    await page.evaluate((yPos) => window.scrollTo(0, yPos), y);
    await page.waitForTimeout(16);
  }
}

async function createVideoContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();
  return { context, page };
}

async function loginWithToken(page, token) {
  // Clear any E2E bypass so real Firebase is used
  await page.addInitScript(() => {
    window.localStorage.removeItem('sstracker_e2e_bypass');
    window.localStorage.removeItem('auth_state');
    window.localStorage.removeItem('sstracker_mock_role');
  });
  
  // Go to home to load the app context
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  
  // Wait for JS to initialize window.__SIGN_IN_CUSTOM__
  await page.waitForFunction(() => typeof window.__SIGN_IN_CUSTOM__ === 'function', { timeout: 10000 });
  
  // Login using the exposed facade method
  await page.evaluate(async (customToken) => {
    await window.__SIGN_IN_CUSTOM__(customToken);
  }, token);
}

async function recordTrainingTriangleHero(browser) {
  console.log('🌱 Seeding fresh dev database state...');
  execSync('node scripts/seed-training-triangle.mjs', { stdio: 'inherit' });
  
  const tokens = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-tokens.json'), 'utf-8'));

  console.log('🎬 Recording Master Hero: "The Training Triangle In Action"...');

  const { context, page } = await createVideoContext(browser);

  try {
    // ══════════════════════════════════════════════════════════════════
    // ACT 1: COACH OS — TACTICAL INTENT DEPLOYMENT
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 1: Coach OS (Tactical War Room & Intent Dispatch)...');
    await loginWithToken(page, tokens.coach);
    await page.goto(`${BASE_URL}/coach/forge`, { waitUntil: 'domcontentloaded' });
    
    // Wait for roster to load
    await page.waitForTimeout(2000);

    // Mouse over to Drill Designer toolbox and set up bounty
    await smoothMouseMove(page, 200, 300, 1500, 300, 40);
    
    await page.screenshot({ path: path.join(RAW_DIR, 'debug-forge.png') });
    console.log('     [Debug screenshot saved]');

    // Click "Homework" (default, but just to show action)
    await page.locator('button:has-text("Homework")').click({ timeout: 5000 });
    await page.waitForTimeout(500);
    
    // Select an attribute
    const attributeSelect = page.locator('select').first();
    await attributeSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    
    // Smooth scroll down to players
    await smoothScroll(page, 400);
    
    // Scope -> Squad
    await page.getByRole('button', { name: /SQUAD/i }).click();
    await page.waitForTimeout(1000);
    
    // Hover and Click DEPLOY
    const deployBtn = page.locator('button', { hasText: 'DEPLOY TACTICAL INTENT' });
    const box = await deployBtn.boundingBox();
    if (box) {
       await smoothMouseMove(page, 1000, 500, box.x + box.width / 2, box.y + box.height / 2, 20);
       await deployBtn.click();
       console.log('     [Deployed Tactical Intent]');
    }
    
    // Wait for deployment animation
    await page.waitForTimeout(2500);

    // ══════════════════════════════════════════════════════════════════
    // ACT 2: PLAYER OS — ACCEPTING THE BOUNTY
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 2: Player OS (Vanguard Prism Radar & Athlete HUD)...');
    await loginWithToken(page, tokens.player);
    await page.goto(`${BASE_URL}/player/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Hover over the 6-Axis Vanguard Prism Radar
    await smoothMouseMove(page, 300, 350, 480, 480, 35);
    await page.waitForTimeout(1000);

    // Scroll smoothly to Active Loadout / Bounties
    await smoothScroll(page, 300);
    await page.waitForTimeout(1000);

    // Find the Active Bounty we just deployed
    const logBtn = page.getByRole('button', { name: /LOG REPS/i }).first();
    if (await logBtn.isVisible()) {
        const btnBox = await logBtn.boundingBox();
        await smoothMouseMove(page, 480, 480, btnBox.x + 20, btnBox.y + 10, 20);
        await logBtn.click();
        await page.waitForTimeout(1000);
        
        // Type some reps
        await page.keyboard.type('10');
        await page.waitForTimeout(500);
        
        // Submit
        await page.keyboard.press('Enter');
        console.log('     [Player Logged Reps]');
        
        // Wait for dopamine blast / XP explosion
        await page.waitForTimeout(4000);
    } else {
        console.log('     [Warning] Active bounty log button not found!');
        await page.waitForTimeout(2000);
    }

    // ══════════════════════════════════════════════════════════════════
    // ACT 3: PARENT OS — COMPLIANCE SHIELD
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 3: Parent OS (Verified Proof & Car Ride Home Shield)...');
    await loginWithToken(page, tokens.parent);
    await page.goto(`${BASE_URL}/parent/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Hover over Compliance Shield
    await smoothMouseMove(page, 480, 480, 800, 380, 35);
    await page.waitForTimeout(1500);

    // Scroll to see the completed intent verified proof
    await smoothScroll(page, 400);
    await page.waitForTimeout(3000);

    const video = page.video();
    await context.close();

    if (video) {
      const rawPath = await video.path();
      const targetWebm = path.join(OUTPUT_DIR, 'marketing-hero.webm');
      fs.copyFileSync(rawPath, targetWebm);
      console.log(`✨ Master Training Triangle Hero Video Exported: ${targetWebm}`);

      // Transcode to MP4 if ffmpeg is available
      const targetMp4 = path.join(ASSETS_VIDEO_DIR, 'marketing-hero.mp4');
      try {
        console.log('🎥 Transcoding to MP4 for wider compatibility...');
        execSync(`ffmpeg -y -i "${rawPath}" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 128k "${targetMp4}"`, { stdio: 'ignore' });
        console.log(`✨ MP4 Exported: ${targetMp4}`);
      } catch (err) {
        console.log('⚠️ ffmpeg not found or failed. Skipping MP4 transcode. WebM is ready.');
      }
    }
  } catch (error) {
    console.error('❌ Choreography failed:', error);
  } finally {
    await browser.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  await recordTrainingTriangleHero(browser);
})();
