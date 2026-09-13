const fs = require('fs');
const path = require('path');

function walkDir(dir, filterExts) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules')) {
                results = results.concat(walkDir(file, filterExts));
            }
        } else {
            const ext = path.extname(file);
            if (filterExts.includes(ext)) {
                results.push(file);
            }
        }
    });
    return results;
}

const frontendSrc = path.join(__dirname, 'src');
const files = walkDir(frontendSrc, ['.ts', '.js', '.svelte']);
const todos = [];

const pattern = /(TODO|FIXME|HACK|PLACEHOLDER|STUB|NOT IMPLEMENTED)/i;

files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        if (pattern.test(line)) {
            todos.push({
                file: path.relative(__dirname, f),
                line: i + 1,
                text: line.trim()
            });
        }
    });
});

console.log("Found " + todos.length + " TODOs/Stubs");
todos.slice(0, 30).forEach(t => console.log(`${t.file}:${t.line} - ${t.text}`));
