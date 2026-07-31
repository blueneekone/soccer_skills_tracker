import { chromium } from 'playwright';

(async () => {
  console.log('🚀 Starting "Nuclear Americana Tech Noir" Visual HUD Audit (v3)...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Enforce tactical mobile terminal viewport size
  await page.setViewportSize({ width: 375, height: 812 });
  
  try {
    await page.goto('http://localhost:5173/player/dashboard', { timeout: 10000 });
  } catch (err) {
    console.error('❌ Failed to connect to local Svelte Dev Server on port 5173.');
    console.error('👉 Ensure you are running "npm run dev" in a separate PowerShell window before running this script.');
    process.exit(1);
  }

  const auditReport = await page.evaluate(() => {
    const violations = [];

    // 1. Assert all 4 tactical HUD modules render in Svelte DOM
    const modules = {
      'Biometrics Card (.hud-biometrics-card)': document.querySelector('.hud-biometrics-card'),
      'Tactical Map (.hud-tactical-map)': document.querySelector('.hud-tactical-map'),
      'Equipment Schematic (.hud-equipment-schematic)': document.querySelector('.hud-equipment-schematic'),
      'Avatar Station (.hud-avatar-station)': document.querySelector('.hud-avatar-station')
    };

    Object.entries(modules).forEach(([name, element]) => {
      if (!element) {
        violations.push(`CRITICAL UI DEVIATION: Missing HUD Module -> [${name}]`);
      }
    });

    // 2. Validate font families against "Nuclear Americana" guidelines
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      const isMonospaceElement = el.classList.contains('telemetry-data') || el.classList.contains('bpm-counter') || el.tagName === 'CODE';
      
      if (isMonospaceElement && !styles.fontFamily.includes('Geist Mono') && !styles.fontFamily.includes('monospace')) {
        violations.push(`TYPOGRAPHY DEVIATION: Telemetry element ${el.tagName}.${el.className} must use Geist Mono.`);
      }

      // Check for banned transparent color text-white/50 to avoid halation
      if (styles.color === 'rgba(255, 255, 255, 0.5)') {
        violations.push(`HALATION DEVIATION: Banned white opacity opacity (rgba 0.5) found on ${el.tagName}.${el.className}. Use solid gray instead.`);
      }
    });

    return violations;
  });

  if (auditReport.length > 0) {
    console.error('\n❌ UI/UX HUD AUDIT FAILED (v3):');
    console.error(auditReport.join('\n'));
    process.exit(1);
  } else {
    console.log('\n🟢 UI/UX HUD AUDIT PASSED (v3): All 4 tactical modules render with flawless design compliance.');
    process.exit(0);
  }

  await browser.close();
})();
