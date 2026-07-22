const fs = require('fs');

function addAuthStoreImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import { authStore }")) {
    content = content.replace(/<script[^>]*>/, "$&\n\timport { authStore } from '$lib/stores/auth.svelte.js';");
    fs.writeFileSync(file, content);
  }
}

addAuthStoreImport('src/lib/components/director/DirectorBillingAuditPanel.svelte');
addAuthStoreImport('src/lib/components/director/RegistrationRosterAssignPanel.svelte');
addAuthStoreImport('src/lib/components/director/os/VpcApprovalQueue.svelte');
