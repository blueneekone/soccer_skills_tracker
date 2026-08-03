# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\capture-player-dash.spec.ts >> Capture player dashboard
- Location: e2e\capture-player-dash.spec.ts:2:1

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/player/dashboard
Call log:
  - navigating to "http://127.0.0.1:5173/player/dashboard", waiting until "load"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e6]:
    - heading "This site can’t be reached" [level=1] [ref=e7]
    - paragraph [ref=e8]:
      - strong [ref=e9]: 127.0.0.1
      - text: refused to connect.
    - generic [ref=e10]:
      - paragraph [ref=e11]: "Try:"
      - list [ref=e12]:
        - listitem [ref=e13]: Checking the connection
        - listitem [ref=e14]:
          - link "Checking the proxy and the firewall" [ref=e15] [cursor=pointer]:
            - /url: "#buttons"
    - generic [ref=e16]: ERR_CONNECTION_REFUSED
  - generic [ref=e17]:
    - button "Reload" [ref=e19] [cursor=pointer]
    - button "Details" [ref=e20] [cursor=pointer]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | test('Capture player dashboard', async ({ page }) => {
  3  |     // Override authentication
  4  |     await page.addInitScript(() => {
  5  |         (window as any).__TEST_PROFILE__ = {
  6  |             uid: 'test-user',
  7  |             email: 'test@example.com',
  8  |             role: 'player',
  9  |             isProfileComplete: true,
  10 |             isConsented: true,
  11 |             operativeAvatar: {},
  12 |         };
  13 |     });
  14 | 
> 15 |     await page.goto('http://127.0.0.1:5173/player/dashboard');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:5173/player/dashboard
  16 |     await page.waitForTimeout(3000);
  17 |     await page.screenshot({ path: 'audit-artifacts/player-dashboard-post-fix.png', fullPage: true });
  18 | });
  19 | 
```