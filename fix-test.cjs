const fs = require('fs');
let code = fs.readFileSync('functions/__tests__/functionsDeploy.guard.test.js', 'utf8');
code = code.replace("it.skip('registers all split codebases with bundle predeploy'", "it('registers all split codebases with bundle predeploy'");
code = code.replace("it.skip('functions/index.js does not export symbols owned by split codebases'", "it('functions/index.js does not export symbols owned by split codebases'");
code = code.replace("it.skip('platform, core, and rl indexes load for Firebase discovery (smoke require)'", "it('platform, core, and rl indexes load for Firebase discovery (smoke require)'");
fs.writeFileSync('functions/__tests__/functionsDeploy.guard.test.js', code);
