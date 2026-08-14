const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Loading mock links...');
  const links = JSON.parse(fs.readFileSync('./mock-links.json', 'utf-8'));

  const browser = await chromium.launch({ headless: true });
  console.log('Browser launched. Capturing marketing clips...');
  const baseUrl = 'http://localhost:5173'; 

  if (!fs.existsSync('./recordings')){
      fs.mkdirSync('./recordings');
  }

  async function capturePersona(link, email, targetRoute, name) {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
    });
    const page = await context.newPage();
    console.log(`Authenticating and capturing ${name}...`);
    
    // 1. Establish origin
    await page.goto(baseUrl, { timeout: 60000 });
    
    // 2. Set Firebase Magic Link email requirement
    await page.evaluate((email) => {
       window.localStorage.setItem('emailForSignIn', email);
    }, email);
    
    // 3. Navigate to Magic Link to trigger Firebase Auth
    await page.goto(link);
    
    // 4. Wait for Firebase to process the link and redirect to /login then to /target
    await page.waitForTimeout(6000); 
    
    // 5. Force navigation just in case
    await page.goto(`${baseUrl}${targetRoute}`);
    await page.waitForTimeout(6000); 
    
    await context.close();
    console.log(`Saved ${name} recording.`);
  }

  await capturePersona(links['marketing-player-uid'], 'marketing_player@mock.com', '/tracker', 'Player OS');
  await capturePersona(links['marketing-coach-uid'], 'marketing_coach@mock.com', '/coach/tactical', 'Coach OS');
  await capturePersona(links['marketing-admin-uid'], 'marketing_admin@mock.com', '/admin', 'Admin OS');

  await browser.close();
  console.log('Clips recorded to ./recordings.');
})();
