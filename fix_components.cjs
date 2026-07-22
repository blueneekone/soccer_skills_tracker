const fs = require('fs');

function addDefensiveHydration(file) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("if (!db || !authStore.isAuthenticated) return;")) {
     content = content.replace(/(async function \w+\([^)]*\)\s*\{)/g, "$1\n\t\tif (!db || !authStore.isAuthenticated) return;");
     fs.writeFileSync(file, content);
  }
}

addDefensiveHydration('src/lib/components/director/DirectorCommsCompliancePanel.svelte');
addDefensiveHydration('src/lib/components/director/DirectorDrillRecommendationsPanel.svelte');
addDefensiveHydration('src/lib/components/director/os/VpcApprovalQueue.svelte');
addDefensiveHydration('src/lib/components/director/MarketingTab.svelte');
addDefensiveHydration('src/lib/components/director/RegistrationRosterAssignPanel.svelte');
addDefensiveHydration('src/lib/components/director/PlaybookTab.svelte');
addDefensiveHydration('src/lib/components/director/DirectorBillingAuditPanel.svelte');
addDefensiveHydration('src/routes/(app)/director/exceptions/FailsafeOverride.svelte');
addDefensiveHydration('src/routes/(app)/director/uplinks/+page.svelte');
