import { chromium } from 'playwright';

/**
 * Injects a mock Firebase Auth user directly into the browser's LocalStorage 
 * to bypass the login redirects and pass the B815 Defensive Hydration check.
 */
async function injectMockAuth(page, uid, email, role) {
  // 1. Navigate to the root domain first to establish the origin context
  await page.goto('http://localhost:5173/');

  // 2. Inject mock Firebase Auth User State into LocalStorage
  await page.evaluate(({ uid, email, role }) => {
    const firebaseApiKey = "AIzaSyCiBoemXJHTkTnujTwM1vOJc4FrVZF8Lw8"; // Matches your local dev setup
    const storageKey = `firebase:authUser:${firebaseApiKey}:[DEFAULT]`;

    const mockUser = {
      uid: uid,
      email: email,
      emailVerified: true,
      isAnonymous: false,
      stsTokenManager: {
        accessToken: "mock-jwt-access-token",
        refreshToken: "mock-refresh-token",
        expirationTime: Date.now() + 3600000 // Valid for 1 hour
      },
      // Injects the Custom Claims required for Svelte role routing gates
      claims: {
        role: role,
        tenantId: "mock-tenant-id"
      }
    };

    window.localStorage.setItem(storageKey, JSON.stringify(mockUser));
  }, { uid, email, role });
}

(async () => {
  // Grab the target persona from command line arguments (defaults to player)
  const targetPersona = (process.argv[2] || 'player').toLowerCase();

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Set viewport to target mobile tablet / dashboard viewport
  await page.setViewportSize({ width: 375, height: 812 });

  // Resolve target url based on the persona
  const targetUrl = `http://localhost:5173/${targetPersona}/dashboard`;
  console.log(`📡 Crawling Localhost -> Target Route: ${targetUrl}`);

  try {
    await injectMockAuth(page, 'mock-uid', 'mock@test.com', targetPersona);
    await page.goto(targetUrl, { timeout: 5000, waitUntil: 'domcontentloaded' });
  } catch (err) {
    console.error(`❌ CRITICAL: Could not connect to development server at ${targetUrl}. Is 'npm run dev' running?`);
    process.exit(1);
  }

  const auditReport = await page.evaluate((persona) => {
    const violations = [];

    // Helper to assert elements exist in DOM
    const assertElement = (selector, name) => {
      if (!document.querySelector(selector)) {
        violations.push(`CRITICAL UI DEVIATION [${persona.toUpperCase()}]: Missing HUD Component -> ${name} (${selector})`);
      }
    };

    // Persona-Specific Layout Module Checks
    if (persona === 'player') {
      assertElement('.hud-biometrics-card', 'Biometrics Cardiac Module');
      assertElement('.hud-tactical-map', 'Tactical Live Play Map');
      assertElement('.hud-equipment-schematic', 'Equipment Durability Schematic');
      assertElement('.hud-avatar-station', 'Avatar Customization Station');
    } else if (persona === 'coach') {
      assertElement('.sideline-siem-panel', 'Sideline SIEM Live Feed');
      assertElement('.tactical-playbook-board', 'Tactical Playbook Board');
    } else if (persona === 'director') {
      assertElement('.revenue-engine-analytics', 'Club Revenue Analytics');
      assertElement('.roster-hierarchy-tree', 'God-Mode Club Roster Tree');
    } else if (persona === 'admin') {
      assertElement('.command-plane-system-status', 'Global System Status Indicator');
      assertElement('.tenant-matrix-grid', 'Master Tenant Matrix Grid');
    }

    // Universal Design System Token Checks
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);

      // 1. Block low-contrast/unsupported opacities that cause halation on Void Black
      if (styles.color.includes('rgba') && styles.color.includes('0.5')) {
        // Exempt standard framework elements, focus purely on primary layout elements
        if (el.classList.contains('telemetry-data') || el.classList.contains('bpm-counter')) {
          violations.push(`CONTRAST DEVIATION: Monospace telemetry cannot use low opacity text.`);
        }
      }

      // 2. Ensure monospaced telemetry font is assigned correctly
      const isMonospaceElement = el.classList.contains('telemetry-data') || el.classList.contains('bpm-counter') || el.classList.contains('coordinate-feed');
      if (isMonospaceElement && !styles.fontFamily.includes('Geist Mono')) {
        violations.push(`TYPOGRAPHY DEVIATION: Telemetry element ${el.tagName} must compile Geist Mono.`);
      }
    });

    return violations;
  }, targetPersona);

  if (auditReport.length > 0) {
    console.error(`❌ UI/UX HUD AUDIT FAILED for [${targetPersona.toUpperCase()}]:`);
    console.error(auditReport.join('\n'));
    process.exit(1);
  } else {
    console.log(`🟢 UI/UX HUD AUDIT PASSED for [${targetPersona.toUpperCase()}]: All active design system tokens conform.`);
    process.exit(0);
  }

  await browser.close();
})();
