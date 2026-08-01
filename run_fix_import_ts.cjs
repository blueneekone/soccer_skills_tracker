const fs = require('fs');
let content = fs.readFileSync('src/routes/(app)/admin/overview/+page.svelte', 'utf8');
content = content.replace(/import AdminDashboardEngine from '.\/AdminDashboardEngine.svelte.ts';/, "import AdminDashboardEngine from './AdminDashboardEngine.svelte';");
fs.writeFileSync('src/routes/(app)/admin/overview/+page.svelte', content);

let contentTest = fs.readFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', 'utf8');
contentTest = contentTest.replace(/import AdminDashboardEngine from '\.\.\/AdminDashboardEngine\.svelte\.ts';/, "import AdminDashboardEngine from '../AdminDashboardEngine.svelte';");
fs.writeFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', contentTest);
