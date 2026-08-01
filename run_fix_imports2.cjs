const fs = require('fs');
let content = fs.readFileSync('src/routes/(app)/admin/overview/AdminDashboardEngine.svelte.ts', 'utf8');
content = content.replace(/import \{ db \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/firebase\/client";/, "import { db } from '$lib/firebase/config';");
content = content.replace(/import \{ authStore \} from "\.\.\/\.\.\/\.\.\/\.\.\/lib\/stores\/auth\.svelte";/, "import { authStore } from '$lib/stores/auth.svelte';");
fs.writeFileSync('src/routes/(app)/admin/overview/AdminDashboardEngine.svelte.ts', content);

let contentTest = fs.readFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', 'utf8');
contentTest = contentTest.replace(/vi.mock\('\$lib\/firebase\/client',/, "vi.mock('$lib/firebase/config',");
fs.writeFileSync('src/routes/(app)/admin/overview/__tests__/adminOverview.layout.test.ts', contentTest);
