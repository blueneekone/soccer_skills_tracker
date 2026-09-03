const fs = require('fs');
let code = fs.readFileSync('functions-compliance/index.js', 'utf8');
if (!code.includes('const lazy =')) {
  code = code.replace("exports.initializeIndependentDirector =", "const lazy = (mod, fn) => (...args) => require(mod)[fn](...args);\nexports.initializeIndependentDirector =");
}
fs.writeFileSync('functions-compliance/index.js', code);
