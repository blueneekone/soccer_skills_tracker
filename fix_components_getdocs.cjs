const fs = require('fs');

const files = [
  'src/lib/components/director/DirectorCommsCompliancePanel.svelte',
  'src/lib/components/director/DirectorDrillRecommendationsPanel.svelte',
  'src/lib/components/director/os/VpcApprovalQueue.svelte',
  'src/lib/components/director/MarketingTab.svelte',
  'src/lib/components/director/RegistrationRosterAssignPanel.svelte',
  'src/lib/components/director/PlaybookTab.svelte',
  'src/lib/components/director/DirectorBillingAuditPanel.svelte',
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("if (!db || !authStore.isAuthenticated) return;")) {
    content = content.replace(/(async function \w+\([^)]*\)\s*\{)/g, "$1\n\t\tif (!db || !authStore.isAuthenticated) return;");
    // Some are inside arrow functions or other structures...

  }
  fs.writeFileSync(file, content);
});
