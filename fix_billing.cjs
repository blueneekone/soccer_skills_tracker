const fs = require('fs');
let content = fs.readFileSync('src/lib/components/director/DirectorBillingAuditPanel.svelte', 'utf8');

content = content.replace(/(void \(async \(\) => \{[\s\S]*?try \{)/, "$1\n\t\t\t\tif (!db || !authStore.isAuthenticated) return;");

fs.writeFileSync('src/lib/components/director/DirectorBillingAuditPanel.svelte', content);
