const fs = require('fs');
let code = fs.readFileSync('src/routes/(app)/director/exceptions/FailsafeOverride.svelte', 'utf8');

if (!code.includes("if (!db || !authStore.isAuthenticated) return;")) {
  code = code.replace("if (!isAuthorized) return;", "if (!isAuthorized) return;\n\t\tif (!db || !authStore.isAuthenticated) return;");
}
fs.writeFileSync('src/routes/(app)/director/exceptions/FailsafeOverride.svelte', code);
