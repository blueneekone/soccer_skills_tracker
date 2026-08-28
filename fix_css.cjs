const fs = require('fs');
let css = fs.readFileSync('src/design-tokens-v4.css', 'utf-8');
css = css.replace(/\\n/g, '\n');
fs.writeFileSync('src/design-tokens-v4.css', css, 'utf-8');
