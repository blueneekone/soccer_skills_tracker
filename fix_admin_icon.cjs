const fs = require('fs');
const path = 'src/routes/(app)/admin/organizations/[clubId]/+page.svelte';
let content = fs.readFileSync(path, 'utf8');
if (!content.includes('clubSportIconToken')) {
    content = content.replace(
        'import { clubSportAccent } from \'/utils/sport-icon.js\';',
        'import { clubSportAccent, clubSportIconToken } from \'/utils/sport-icon.js\';'
    );
    // if the above didn't work because it doesn't exist exactly like that:
    if (!content.includes('clubSportIconToken')) {
        content = content.replace(
            '<script lang=\"ts\">',
            '<script lang=\"ts\">\n\timport { clubSportIconToken } from \'/utils/sport-icon.js\';'
        );
    }
}
content = content.replace(
  '<Icon name={\"sport.soccer\" as IconName} /> Primary Facility',
  '<Icon name={clubSportIconToken(cl?.sport) as IconName} /> Primary Facility'
);
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced Admin icon successfully');
