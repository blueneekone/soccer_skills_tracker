const fs = require('fs');
const content = fs.readFileSync('temp_review/FacilityMapVault.svelte', 'utf8');

const scriptMatch = content.match(/<script lang="ts">([\s\S]*?)<\/script>/);
const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
let template = content;
if (scriptMatch) template = template.replace(scriptMatch[0], '');
if (styleMatch) template = template.replace(styleMatch[0], '');

console.log("Script length:", scriptMatch[1].split('\n').length);
console.log("Style length:", styleMatch[1].split('\n').length);
console.log("Template length:", template.split('\n').length);
