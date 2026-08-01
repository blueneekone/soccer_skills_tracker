const fs = require('fs');
let content = fs.readFileSync('src/routes/(app)/admin/overview/AdminDashboardEngine.svelte.ts', 'utf8');
content = content.replace(/import { db } from '\$lib\/firebase\/client';/, "import { db } from '../../../../lib/firebase/client';");
content = content.replace(/import { authStore } from '\$lib\/stores\/auth\.svelte';/, "import { authStore } from '../../../../lib/stores/auth.svelte';");
fs.writeFileSync('src/routes/(app)/admin/overview/AdminDashboardEngine.svelte.ts', content);
