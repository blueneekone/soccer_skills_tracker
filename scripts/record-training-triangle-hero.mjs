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

async function createAuthenticatedContext(browser, role, profile = {}) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: RAW_DIR,
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  await page.addInitScript(({ role, profile }) => {
    const authState = {
      role,
      isProfileComplete: true,
      email: `${role}@apex-fc.org`,
      displayName: profile.displayName || (role === 'coach' ? 'Coach Henderson' : role === 'player' ? 'Leo Hernandez' : 'Elena Hernandez (Parent)'),
      clubId: profile.clubId || 'apex-fc',
      tenantId: profile.clubId || 'apex-fc',
      teamId: profile.teamId || 'u17-premier',
      householdId: profile.householdId || 'hh-hernandez-01',
      ...profile
    };

    window.localStorage.setItem('auth_state', JSON.stringify(authState));
    window.localStorage.setItem('sstracker_e2e_bypass', 'true');
    window.localStorage.setItem('sstracker_mock_role', role);
    window.localStorage.setItem('sstracker_mock_profile', JSON.stringify(authState));
  }, { role, profile });

  return { context, page };
}

async function recordTrainingTriangleHero(browser) {
  console.log('🎬 Recording Master Hero: "The Training Triangle In Action"...');

  const { context, page } = await createAuthenticatedContext(browser, 'coach', {
    displayName: 'Coach Henderson',
    clubId: 'apex-fc',
    teamId: 'u17-premier'
  });

  try {
    // ══════════════════════════════════════════════════════════════════
    // ACT 1: COACH OS — TACTICAL INTENT & MISSION DEPLOYMENT
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 1: Coach OS (Tactical War Room & Intent Dispatch)...');
    await page.goto(`${BASE_URL}/coach/tactical`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Smooth hover across the Tactical Pitch
    await smoothMouseMove(page, 200, 300, 700, 450, 35);
    await page.waitForTimeout(1000);

    // Hover over Drill Designer toolbox
    await smoothMouseMove(page, 700, 450, 1350, 350, 30);
    await page.waitForTimeout(1200);

    // Pan down to squad readiness matrix
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(1800);

    // ══════════════════════════════════════════════════════════════════
    // ACT 2: PLAYER OS — DOPAMINE ENGINE & BIOMECHANICS XP
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 2: Player OS (Vanguard Prism Radar & Athlete HUD)...');
    await page.evaluate(() => {
      const playerState = {
        role: 'player',
        isProfileComplete: true,
        email: 'leo@apex-fc.org',
        displayName: 'Leo Hernandez (U17 Forward)',
        clubId: 'apex-fc',
        tenantId: 'apex-fc',
        teamId: 'u17-premier',
        xp: 6420,
        currentStreak: 18,
        level: 14
      };
      window.localStorage.setItem('auth_state', JSON.stringify(playerState));
      window.localStorage.setItem('sstracker_mock_role', 'player');
    });

    await page.goto(`${BASE_URL}/player/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Hover over the 6-Axis Vanguard Prism Radar
    await smoothMouseMove(page, 300, 350, 580, 480, 35);
    await page.waitForTimeout(1500);

    // Hover to the XP Daily Streak & Level progression meter
    await smoothMouseMove(page, 580, 480, 1150, 320, 30);
    await page.waitForTimeout(1500);

    // Scroll smoothly to Bounty Quests & Active Loadout
    await page.evaluate(() => window.scrollTo({ top: 450, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    // ══════════════════════════════════════════════════════════════════
    // ACT 3: PARENT OS — THE COMPLIANCE SHIELD & CAR RIDE HOME
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 3: Parent OS (Verified Proof & Car Ride Home Shield)...');
    await page.evaluate(() => {
      const parentState = {
        role: 'parent',
        isProfileComplete: true,
        email: 'elena@apex-fc.org',
        displayName: 'Elena Hernandez',
        clubId: 'apex-fc',
        tenantId: 'apex-fc',
        householdId: 'hh-hernandez-01'
      };
      window.localStorage.setItem('auth_state', JSON.stringify(parentState));
      window.localStorage.setItem('sstracker_mock_role', 'parent');
    });

    await page.goto(`${BASE_URL}/parent/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Hover over Compliance Shield & Car Ride Home Protocol timer
    await smoothMouseMove(page, 350, 300, 800, 380, 35);
    await page.waitForTimeout(1500);

    // Scroll to Household Roster & Verified Proofs
    await page.evaluate(() => window.scrollTo({ top: 400, behavior: 'smooth' }));
    await page.waitForTimeout(2000);

    // ══════════════════════════════════════════════════════════════════
    // ACT 4: DIRECTOR OS — CLUB-WIDE OMNISCIENCE & METRICS
    // ══════════════════════════════════════════════════════════════════
    console.log('  -> Act 4: Director OS (Club-Wide Command Center)...');
    await page.evaluate(() => {
      const directorState = {
        role: 'director',
        isProfileComplete: true,
        email: 'director@apex-fc.org',
        displayName: 'Director Sterling',
        clubId: 'apex-fc',
        tenantId: 'apex-fc'
      };
      window.localStorage.setItem('auth_state', JSON.stringify(directorState));
      window.localStorage.setItem('sstracker_mock_role', 'director');
    });

    await page.goto(`${BASE_URL}/director/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Hover over Tryout Pipeline & KPI matrix
    await smoothMouseMove(page, 400, 320, 850, 340, 30);
    await page.waitForTimeout(1800);

    await page.waitForTimeout(1000);
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
        execSync(
          `ffmpeg -y -i "${targetWebm}" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${targetMp4}"`,
          { stdio: 'ignore' }
        );
        console.log(`✨ Master Training Triangle MP4 Exported: ${targetMp4}`);
      } catch {
        console.log('ℹ️ ffmpeg not available in path, WebM master preserved.');
      }
    }
  } catch (err) {
    console.error('❌ Error recording master hero video:', err);
    await context.close();
    throw err;
  }
}

(async () => {
  console.log('⚡ Launching High-Fidelity Training Triangle Recording Engine...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    await recordTrainingTriangleHero(browser);
    console.log('🎉 TRAINING TRIANGLE MASTER VIDEO CAPTURE COMPLETE!');
  } catch (err) {
    console.error('Fatal capture error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
