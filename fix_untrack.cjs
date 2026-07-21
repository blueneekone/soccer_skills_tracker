const fs = require('fs');
let code = fs.readFileSync('src/lib/components/shell/PlayerActivityStreak.svelte', 'utf8');

if (!code.includes('import { untrack } from "svelte"')) {
    code = code.replace("import { browser } from '$app/environment';", "import { browser } from '$app/environment';\n\timport { untrack } from 'svelte';");
}

code = code.replace(/const uid = authStore\.user\.uid;/g, `const uid = untrack(() => authStore.user?.uid);
		if (!uid) return;`);

fs.writeFileSync('src/lib/components/shell/PlayerActivityStreak.svelte', code);
