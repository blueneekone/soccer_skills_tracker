const fs = require('fs');
const glob = require('glob');
glob('src/routes/(app)/parent/**/*.svelte', (err, files) => {
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Target specific panel backgrounds with rounded classes
        const patterns = [
            /(tw-bg-\[[^\]]+\][^>]*?)tw-rounded-(xl|lg|md|2xl|none)/g,
            /(tw-rounded-(xl|lg|md|2xl|none)[^>]*?)tw-bg-\[[^\]]+\]/g,
            /(tw-border[^>]*?)tw-rounded-(xl|lg|md|2xl|none)/g
        ];
        
        patterns.forEach(p => {
            if (content.match(p)) {
                content = content.replace(p, (match) => match.replace(/tw-rounded-(xl|lg|md|2xl|none)/g, 'tw-rounded-[24px]'));
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Modified ' + file);
        }
    });
});
