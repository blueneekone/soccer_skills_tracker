const fs = require('fs');
let code = fs.readFileSync('functions/__tests__/functionsDeploy.guard.test.js', 'utf8');
code = code.replace("it.skip('smoke-require-codebase.cjs --simulate-cloud does not load sharp'", "it('smoke-require-codebase.cjs --simulate-cloud does not load sharp'");
fs.writeFileSync('functions/__tests__/functionsDeploy.guard.test.js', code);
