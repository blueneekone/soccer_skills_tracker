const fs = require('fs');
let code = fs.readFileSync('functions/src/domains/streakOps.js', 'utf8');

code = code.replace(/..\/utils\/adminDb.js/g, "../../cellRouter.js");

fs.writeFileSync('functions/src/domains/streakOps.js', code);
