const fs = require('fs');
let code = fs.readFileSync('src/lib/components/field-ops/FacilityMapVaultEngine.svelte.ts', 'utf8');

code = code.replace(/await syncFacilityToLegacyField\(\{ clubId: this.clubId, facilityId, name, address, status \}\);/g, 'await syncFacilityToLegacyField({ clubId: this.clubId, fieldId: facilityId, name, location: address, status });');

fs.writeFileSync('src/lib/components/field-ops/FacilityMapVaultEngine.svelte.ts', code);
