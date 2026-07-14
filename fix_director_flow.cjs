const fs = require('fs');
const path = 'src/routes/(app)/director/dashboard/+page.svelte';
let content = fs.readFileSync(path, 'utf8');

// We want to add tw-h-[100dvh] tw-flex tw-flex-col tw-overflow-hidden to the root div, 
// and flex: 1 1 auto; min-height: 0 to the child scrolling div if it's not already using flex-1
if (content.includes('director-console-page')) {
    content = content.replace(
        '<div class=\"director-console-page\">',
        '<div class=\"director-console-page tw-h-[100dvh] tw-flex tw-flex-col tw-overflow-hidden\">'
    );
}
fs.writeFileSync(path, content, 'utf8');
console.log('Modified director console page flow');
