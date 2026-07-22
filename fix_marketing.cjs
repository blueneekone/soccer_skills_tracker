const fs = require('fs');
let content = fs.readFileSync('src/lib/components/director/MarketingTab.svelte', 'utf8');

content = content.replace(/(try \{[\s\S]*?const q = query\([\s\S]*?collection\(db, 'clubs', cid, 'campaigns'\),)/, "try {\n\t\t\t\tif (!db || !authStore.isAuthenticated) return;\n\t\t\t\tconst q = query(\n\t\t\t\t\tcollection(db, 'clubs', cid, 'campaigns'),");

fs.writeFileSync('src/lib/components/director/MarketingTab.svelte', content);
