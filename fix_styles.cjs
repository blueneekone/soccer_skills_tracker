const fs = require('fs');

let shell = fs.readFileSync('src/lib/components/field-ops/FacilityMapVault.svelte', 'utf8');

// If Shell is > 500 we can extract common CSS or just trim it. Shell is 525 lines. 
// We can move some styles down into Arena or HUD. But the task says "Each file must stay under 500 lines. The original file becomes the Shell." 
// Let's move modal and preview drawer styles to Arena, and table styles to HUD.

let arenaCss = '';
let hudCss = '';
let shellCss = '';

const extract = (cssStr, regex) => {
    let match = cssStr.match(regex);
    if(match) return match[0] + '\n';
    return '';
};

// Modal and preview styles -> Arena
// Table styles -> HUD
