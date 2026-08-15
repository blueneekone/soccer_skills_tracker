import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000);
  
  console.log('Checking if login is possible...');
  
  // Try to use Firebase Auth JS SDK directly in the browser context to log in
  const result = await page.evaluate(async () => {
    try {
      // Assuming firebase is loaded
      const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');
      const auth = getAuth();
      const cred = await signInWithEmailAndPassword(auth, 'coach-test@sstracker.app', 'password123');
      return { success: true, uid: cred.user.uid, email: cred.user.email };
    } catch (e) {
      return { success: false, error: e.message };
    }
  });
  
  console.log('Login result:', result);
  await browser.close();
})();
