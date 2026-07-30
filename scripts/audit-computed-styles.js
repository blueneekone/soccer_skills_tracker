const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Set to mobile viewport to check anti-squish math
  await page.setViewportSize({ width: 375, height: 812 });
  
  // Navigate to player dashboard (can be customized via env or args)
  const targetUrl = process.env.AUDIT_TARGET_URL || 'http://localhost:5173/player/dashboard';
  console.log(`[UI/UX Audit] Navigating to: ${targetUrl}`);
  
  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
  } catch (err) {
    console.error(`[UI/UX Audit] Failed to load page: ${err.message}`);
    process.exit(1);
  }

  const styleViolations = await page.evaluate(() => {
    const elements = document.querySelectorAll('*');
    const violations = [];
    const REQUIRED_FONTS = ['Geist Mono', 'Switzer', 'Geist Sans'];
    
    // Nuclear Americana Color taxonomy: Void Black, Navy Slate, Data Cyan, Action Gold
    const VOID_BLACK = 'rgb(0, 0, 0)';
    const NAVY_SLATE = 'rgb(15, 23, 42)'; // #0f172a
    const DATA_CYAN = 'rgb(20, 184, 166)'; // #14b8a6
    const ACTION_GOLD = 'rgb(251, 191, 36)'; // #fbbf24

    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      
      // 1. Enforce strict background constraint (Void Black or Navy Slate only)
      // Check only on major panels or root sections to avoid false positives on transparent text wrappers
      if (el.classList.contains('pd-page-root') || el.classList.contains('player-dossier-root')) {
        const bg = styles.backgroundColor;
        if (bg !== VOID_BLACK && bg !== NAVY_SLATE) {
          violations.push(`[Theme Violation] Root container background must be Void Black (#000000) or Navy Slate (#0f172a). Found: ${bg}`);
        }
      }

      // 2. Check for banned alpha halation opacities on text
      const color = styles.color;
      if (color.includes('rgba') && color.endsWith(', 0.5)')) {
        violations.push(`[Style Violation] Banned text opacity found on element: ${el.tagName}.${el.className.split(' ').join('.')}`);
      }
      
      // 3. Enforce 12-column Bento Grid fluid clamp math (Anti-squish constraint)
      if (styles.display === 'grid' && el.classList.contains('st-bento')) {
        const gridCols = styles.gridTemplateColumns;
        if (!gridCols.includes('clamp') && !el.style.gridTemplateColumns.includes('clamp')) {
           violations.push(`[Layout Violation] Grid container .st-bento is missing fluid clamp math (anti-squish check) on: .${el.className.split(' ').join('.')}`);
        }
      }

      // 4. Ensure Geist Mono is strictly applied to technical/numerical displays
      if (el.classList.contains('tw-font-mono') || el.classList.contains('stat-value') || el.classList.contains('telemetry-readout')) {
        const fontFamily = styles.fontFamily;
        const hasGeistMono = fontFamily.toLowerCase().includes('geist mono') || fontFamily.toLowerCase().includes('monospace');
        if (!hasGeistMono) {
          violations.push(`[Typographic Violation] Technical element is missing Geist Mono. Rendered font family: ${fontFamily}`);
        }
      }
    });
    return violations;
  });

  if (styleViolations.length > 0) {
    console.error('\n❌ UI/UX AUDIT FAILED - DESIGN SYSTEM VIOLATIONS DETECTED:');
    console.error('===========================================================');
    styleViolations.forEach((v, idx) => console.error(`${idx + 1}. ${v}`));
    console.error('===========================================================');
    await browser.close();
    process.exit(1);
  } else {
    console.log('\n✅ UI/UX AUDIT PASSED - Layout mathematically complies with Nuclear Americana Tech Noir.');
    await browser.close();
    process.exit(0);
  }
})();