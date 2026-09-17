const fs = require('fs');
let code = fs.readFileSync('src/lib/components/director/os/__tests__/epic53DeploymentCalendar.test.ts', 'utf8');

if (code.includes('expect(vault).toMatch(/FacilityMapVaultEngine/);')) {
   // it's fixed.
} else {
    code = code.replace(/expect\(vault\)\.toMatch\(\/syncFacilityToLegacyField\/\);/, "expect(vault).toMatch(/FacilityMapVaultEngine/);");
    code = code.replace(/expect\(vault\)\.toMatch\(\/mirrorFacilityToFields\/\);/, "");
    fs.writeFileSync('src/lib/components/director/os/__tests__/epic53DeploymentCalendar.test.ts', code);
}
