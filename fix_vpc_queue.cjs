const fs = require('fs');
let content = fs.readFileSync('src/lib/components/director/os/VpcApprovalQueue.svelte', 'utf8');
content = content.replace(/(try \{)/, "$1\n\t\t\t\tif (!db || !authStore.isAuthenticated) return;");
fs.writeFileSync('src/lib/components/director/os/VpcApprovalQueue.svelte', content);
