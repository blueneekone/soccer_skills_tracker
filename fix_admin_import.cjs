const fs = require('fs');
const path = 'src/routes/(app)/admin/organizations/[clubId]/+page.svelte';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  'import { clubSportIconToken } from \'/utils/sport-icon.js\';',
  'import { clubSportIconToken } from \'/utils/sport-icon.js\';'
);
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed import');
