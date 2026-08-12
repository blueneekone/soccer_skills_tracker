import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Helper to delay actions to mimic organic human interaction speeds ( Visceral micro-interactions )
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function recordSegment(persona, route, recordingName, interactionCallback) {
  console.log(`🎬 [SSTracker Pipeline] Spinning up context for persona: ${persona.toUpperCase()}`);
  
  const browser = await chromium.launch({ headless: true });
  
  // Set explicit high-fidelity 1080p dimensions for professional video quality
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: './recordings/raw',
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Bypassing Auth Wall: Injecting programmatic mock token with custom JWT claims to satisfy Zero-Trust rules
  console.log(`🔒 [CSO Guard] Injecting mock Custom JWT Claims and role: '${persona}'`);
  await page.addInitScript((params) => {
    const mockAuthUser = {
      uid: `test-${params.persona}-uid`,
      email: `${params.persona}@sstracker.app`,
      emailVerified: true,
      customClaims: {
        role: params.persona,
        clubId: 'mock-club-123',
        tenantId: 'mock-tenant-456'
      }
    };
    
    // Seed both local storage and window objects to bypass SvelteKit layout interceptors
    window.localStorage.setItem(`firebase:authUser:${mockAuthUser.uid}`, JSON.stringify(mockAuthUser));
    window.localStorage.setItem('active_session_claims', JSON.stringify(mockAuthUser.customClaims));
    window.localStorage.setItem('active_session_user', JSON.stringify(mockAuthUser));
    
    // Hook into authStore facade
    window.__authMockEnabled = true;
    window.__mockUser = mockAuthUser;
  }, { persona });

  // Navigate to target route on local development server
  const targetUrl = `http://localhost:5173${route}`;
  console.log(`🌐 [CRO Traversal] Navigating to: ${targetUrl}`);
  
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 15000 });
  } catch (err) {
    console.error(`⚠️ Initial navigation failed, retrying once to handle cold-starts: ${err.message}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  }

  // Execute the visual interactive routine for this specific persona
  await interactionCallback(page);

  // Close the context to force Playwright to flush and finalize the WebM container
  console.log(`💾 [SSTracker Pipeline] Finalizing raw clip: ${recordingName}`);
  await context.close();
  await browser.close();

  // Move the generated video file to a structured path
  const rawVideoPath = await page.video().path();
  const destPath = path.join(process.cwd(), 'recordings', `${recordingName}.webm`);
  
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.renameSync(rawVideoPath, destPath);
  console.log(`✅ [SSTracker Pipeline] Captured clip saved to: ${destPath}\n`);
}

async function runVideoPipeline() {
  console.log("🚀 ===================================================");
  console.log("🚀 STARTING SSTRACKER AUTOMATED MARKETING CAPTURE SYSTEM");
  console.log("🚀 ===================================================\n");

  // Segment 1: Director OS (The B2B Revenue Engine & Vampire Importer)
  await recordSegment('director', '/director/dashboard/vampire', 'director-segment', async (page) => {
    console.log("🤖 [Director UI] Standardizing 12-column Bento Grid view...");
    await page.waitForSelector('.director-dashboard-root', { timeout: 5000 });
    
    // Simulate uploading the CSV file for the Vampire Importer
    console.log("🤖 [Director UI] Triggering the Vampire Importer CSV file ingestion...");
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.click('.vampire-upload-zone');
    const fileChooser = await fileChooserPromise;
    
    // Create a mock CSV buffer on the fly
    const csvContent = "player_name,age,parent_email\nJane Doe,14,parent@sstracker.app\nJohn Smith,16,guardian@sstracker.app";
    const tempCsvPath = path.join(process.cwd(), 'temp-roster.csv');
    fs.writeFileSync(tempCsvPath, csvContent);
    
    await fileChooser.setFiles(tempCsvPath);
    await delay(2000); // Wait for the import parser to run (80-line limit utility)
    
    console.log("🤖 [Director UI] Verifying atomic database commits and success states...");
    await page.waitForSelector('.import-success-toast');
    await delay(3000); // Hold frame on successful roster render
    fs.unlinkSync(tempCsvPath);
  });

  // Segment 2: Player OS (The Dopamine Engine & Vanguard Prism Charts)
  await recordSegment('player', '/player/dashboard', 'player-segment', async (page) => {
    console.log("🤖 [Player UI] Rendering 40% Void Black Gaming HUD...");
    await page.waitForSelector('.player-hud-root');
    await delay(1000);

    console.log("🤖 [Player UI] Inspecting 6-axis Vanguard Prism SVG Radar Charts...");
    await page.waitForSelector('.vanguard-prism-svg');
    await page.hover('.vanguard-prism-svg'); // Trigger interactive tooltip kinetics
    await delay(2000);

    console.log("🤖 [Player UI] Claiming daily bounty to trigger the Dopamine Engine...");
    await page.click('.claim-bounty-btn');
    
    // Wait for the verified database commit confetti pulse (Core Drive 2)
    console.log("🎉 [Player UI] Verifying database-gated confetti particle explosion!");
    await page.waitForSelector('.confetti-canvas-active');
    await delay(4000); // Allow the celebration animation to play
  });

  // Segment 3: Fan OS (Interactive Broadcast & Ticket Generation)
  await recordSegment('fan', '/fan/broadcast', 'fan-segment', async (page) => {
    console.log("🤖 [Fan UI] Loading live interactive broadcast container...");
    await page.waitForSelector('.fan-broadcast-root');
    await delay(2000);

    console.log("🤖 [Fan UI] Tapping the 'Spot the Ball' digital fundraising overlay...");
    await page.click('.spot-the-ball-trigger');
    await delay(1500);

    console.log("🤖 [Fan UI] Initiating frictionless Stripe Connect single-tap payment...");
    await page.click('.superdraw-purchase-btn');
    await page.waitForSelector('.ticketing-success-qr');
    await delay(3500); // Capture successful ticket QR code display
  });

  // Segment 4: Parent OS (The Compliance Vault & HIPAA Gateway)
  await recordSegment('parent', '/parent/household', 'parent-segment', async (page) => {
    console.log("🤖 [Parent UI] Gating access behind the HIPAA secure routing interceptor...");
    await page.waitForSelector('.hipaa-interceptor-shell');
    await delay(1500);

    console.log("🤖 [Parent UI] Signing the electronic liability and media release waivers...");
    await page.click('.parent-consent-checkbox');
    await page.type('.e-signature-input', 'Evan Waechtler');
    await delay(1000);

    console.log("🤖 [Parent UI] Submitting signed document to consents vault...");
    await page.click('.parent-authorize-btn'); // Triggers cryptographic metadata encryption
    await page.waitForSelector('.household-status-cleared');
    await delay(3500); // Hold final frame on verified compliance badge
  });

  console.log("🚀 ===================================================");
  console.log("🚀 ALL INDEPENDENT NARRATIVE SEGMENTS RECORDED SUCCESSFULLY");
  console.log("🚀 ===================================================");
}

runVideoPipeline().catch((err) => {
  console.error("❌ Fatal error in Playwright Video Capture Suite:", err);
  process.exit(1);
});
