const fs = require('fs');
let code = fs.readFileSync('src/lib/components/field-ops/FacilityMapVaultArena.svelte', 'utf8');

// The original file used pdfBusy and pdfCanvasEl, let's fix it if there's any problem

fs.writeFileSync('src/lib/components/field-ops/FacilityMapVaultArena.svelte', code);
