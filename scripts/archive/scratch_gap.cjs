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

function scanFrontendCallables(srcDir) {
    const callables = new Set();
    const files = walkDir(srcDir, ['.ts', '.js', '.svelte']);
    files.forEach(f => {
        const content = fs.readFileSync(f, 'utf8');
        const matches = [...content.matchAll(/httpsCallable\(.*?,\s*'([^']+)'\)/g)];
        matches.forEach(m => callables.add(m[1]));
    });
    return Array.from(callables);
}

function scanBackendExports(functionsDirs) {
    const exportsSet = new Set();
    functionsDirs.forEach(dir => {
        const files = walkDir(dir, ['.ts', '.js']);
        files.forEach(f => {
            const content = fs.readFileSync(f, 'utf8');
            const lines = content.split('\n');
            lines.forEach(line => {
                if (line.includes('onCall')) {
                    const match = line.match(/exports\.(\w+)/) || line.match(/export const (\w+)\s*=\s*(?:functions\.https\.)?onCall/);
                    if (match) {
                        exportsSet.add(match[1]);
                    }
                }
            });
        });
    });
    return Array.from(exportsSet);
}

const frontendSrc = path.join(__dirname, 'src');
const backendDirs = [
    path.join(__dirname, 'functions'),
    path.join(__dirname, 'functions-core'),
    path.join(__dirname, 'functions-rl'),
    path.join(__dirname, 'functions-commerce'),
    path.join(__dirname, 'functions-compliance'),
    path.join(__dirname, 'functions-integrations'),
    path.join(__dirname, 'functions-platform')
];

const front = scanFrontendCallables(frontendSrc);
const back = scanBackendExports(backendDirs);

const missingInBackend = front.filter(c => !back.includes(c));
const unusedInFrontend = back.filter(c => !front.includes(c));

console.log("=== FRONTEND CALLABLES (" + front.length + ") ===");
// console.log(front.join(", "));
console.log("\n=== MISSING IN BACKEND (" + missingInBackend.length + ") ===");
console.log(missingInBackend.join("\n"));
