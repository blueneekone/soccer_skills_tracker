const fs = require('fs');

function addDefensiveHydrationMarketing() {
  const file = 'src/lib/components/director/MarketingTab.svelte';
  let content = fs.readFileSync(file, 'utf8');

  // The earlier replacement for MarketingTab matched too much and broke existing methods.
  // We'll surgically inject it into load functions if not present.
  if (!content.includes("if (!db || !authStore.isAuthenticated) return;")) {
    content = content.replace(/(async function saveMarketingFunnel\(\) \{)/, "$1\n\t\tif (!db || !authStore.isAuthenticated) return;");
    content = content.replace(/(async function registerGeneratedCampaign\(\) \{)/, "$1\n\t\tif (!db || !authStore.isAuthenticated) return;");
    fs.writeFileSync(file, content);
  }
}
addDefensiveHydrationMarketing();
