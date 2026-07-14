const fs = require('fs');
const glob = require('glob');
glob('src/routes/(app)/admin/**/*.svelte', (err, files) => {
    files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Target specific panel backgrounds with rounded classes
        const patterns = [
            /(tw-bg-\[[^\]]+\][^>]*?)tw-rounded-(xl|lg|md|2xl)/g,
            /(tw-rounded-(xl|lg|md|2xl)[^>]*?)tw-bg-\[[^\]]+\]/g,
            /(tw-border[^>]*?)tw-rounded-(xl|lg|md|2xl)/g
        ];
        
        patterns.forEach(p => {
            if (content.match(p)) {
                content = content.replace(p, (match) => match.replace(/tw-rounded-(xl|lg|md|2xl)/g, 'tw-rounded-none'));
                modified = true;
            }
        });

        // Also fix any Action Gold buttons -> tw-bg-[#334155]
        if (content.includes('action-gold-btn') || content.includes('tw-bg-[#f59e0b]') || content.includes('tw-bg-[#fbbf24]')) {
            content = content.replace(/action-gold-btn/g, 'primary-admin-btn')
                             .replace(/tw-bg-\[\#f59e0b\]/g, 'tw-bg-[#334155]')
                             .replace(/tw-bg-\[\#fbbf24\]/g, 'tw-bg-[#334155]');
            modified = true;
        }

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Modified ' + file);
        }
    });
});
