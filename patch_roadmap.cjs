const fs = require('fs');
const filepath = 'ROADMAP.md';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace(
  "- [x] **PLAYER OS SWARM VISUAL AUDIT & SELF-HEAL**\n- [x] **PLAYER OS SWARM VISUAL AUDIT & SELF-HEAL**: Fixed unit tests (`rosterPanelEngine.test.ts`, `playerDashboard.layout.test.ts`, `playerHudSprint234.test.ts`) and Playwright E2E suites (`persona-interactive-e2e.spec.ts`).",
  "- [x] **PLAYER OS SWARM VISUAL AUDIT & SELF-HEAL**: Fixed unit tests (`rosterPanelEngine.test.ts`, `playerDashboard.layout.test.ts`, `playerHudSprint234.test.ts`) and Playwright E2E suites (`persona-interactive-e2e.spec.ts`)."
);

fs.writeFileSync(filepath, content);
