const fs = require('fs');
let code = fs.readFileSync('functions/src/domains/streakOps.js', 'utf8');

code = code.replace(/..\/..\/cellRouter.js/g, "../utils/adminDb.js");

fs.writeFileSync('functions/src/domains/streakOps.js', code);
