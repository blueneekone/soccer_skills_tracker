const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const targetDirs = ['src/routes/(app)/director', 'src/routes/(app)/coach'];

targetDirs.forEach(d => {
    if (!fs.existsSync(d)) return;
    walkDir(d, (file) => {
        if (!file.endsWith('.svelte')) return;
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Target specific panel backgrounds with rounded classes
        const patterns = [
            /(tw-bg-\[[^\]]+\][^>]*?)tw-rounded-(xl|lg|md|2xl|3xl|\[[^\]]+\])/g,
            /(tw-rounded-(xl|lg|md|2xl|3xl|\[[^\]]+\])[^>]*?)tw-bg-\[[^\]]+\]/g,
            /(tw-border[^>]*?)tw-rounded-(xl|lg|md|2xl|3xl|\[[^\]]+\])/g
        ];
        
        patterns.forEach(p => {
            if (content.match(p)) {
                content = content.replace(p, (match) => match.replace(/tw-rounded-(xl|lg|md|2xl|3xl|\[[^\]]+\])/g, 'tw-rounded-none'));
                modified = true;
            }
        });

        if (modified) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Modified ' + file);
        }
    });
});
