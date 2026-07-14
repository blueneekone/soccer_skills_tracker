const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  try {
    const res = await page.goto('http://localhost:4173/parent/dashboard', { waitUntil: 'networkidle2' });
    console.log('Page loaded! Status:', res.status());
    const content = await page.content();
    console.log('CONTENT SNIPPET:', content.substring(0, 1000));
  } catch (err) {
    console.error('Error navigating:', err);
  }

  await browser.close();
})();
