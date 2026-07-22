const fs = require('fs');
let content = fs.readFileSync('src/lib/components/director/RegistrationRosterAssignPanel.svelte', 'utf8');
content = content.replace(/(async function loadRegistrations\(\) \{)/, "$1\n\t\tif (!db || !authStore.isAuthenticated) return;");
fs.writeFileSync('src/lib/components/director/RegistrationRosterAssignPanel.svelte', content);
