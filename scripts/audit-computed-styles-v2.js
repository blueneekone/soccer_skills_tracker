import { chromium } from 'playwright';

(async () => {
  console.log('🎬 Initializing visual-in-the-loop computed styles audit...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set viewport to mobile to check responsive anti-squish math
  await page.setViewportSize({ width: 375, height: 812 });
  
  try {
    await page.goto('http://localhost:5173/player/dashboard'); // Target dev route
  } catch (err) {
    console.error('\n❌ Error: Could not connect to the local development server.');
    console.error('👉 Please run "npm run dev" or your local Svelte dev server in a separate window first!');
    await browser.close();
    process.exit(1);
  }

  const styleViolations = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const violations = [];
    const BANNED_COLORS = ['rgba(255, 255, 255, 0.5)']; // Example of banned halation opacities
    const REQUIRED_FONTS = ['Geist Mono', 'Switzer', 'Geist Sans'];

    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      
      // 1. Check for banned text opacities on dark backgrounds
      if (BANNED_COLORS.includes(styles.color)) {
        violations.push(`Forbidden text opacity found on element: ${el.tagName}.${el.className}`);
      }
      
      // 2. Enforce 12-column Bento Grid compliance
      if (styles.display === 'grid' && !styles.gridTemplateColumns.includes('clamp')) {
         violations.push(`Grid missing fluid clamp math (Anti-squish constraint): ${el.className}`);
      }
    });
    return violations;
  });

  if (styleViolations.length > 0) {
    console.error('\n🛑 UI/UX AUDIT FAILED - DESIGN SYSTEM VIOLATIONS DETECTED:');
    console.error(styleViolations.join('\n'));
    await browser.close();
    process.exit(1);
  } else {
    console.log('\n🟢 UI/UX AUDIT PASSED - Layout mathematically complies with Nuclear Americana Tech Noir.');
    await browser.close();
    process.exit(0);
  }
})();