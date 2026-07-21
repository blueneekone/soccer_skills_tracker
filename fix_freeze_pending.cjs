const fs = require('fs');
let code = fs.readFileSync('src/lib/components/shell/PlayerActivityStreak.svelte', 'utf8');

code = code.replace(/armory \? armory\.freezeClaimPending : freezeLoading/g, "freezeLoading || (armory ? armory.freezeClaimPending : false)");

fs.writeFileSync('src/lib/components/shell/PlayerActivityStreak.svelte', code);
