import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testsDir = path.join(__dirname, '../src/lib/components/player/dashboard/__tests__');

const files = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.ts'));

for (const file of files) {
    const filePath = path.join(testsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Make pageSrc encompass the entire Trinity so any legacy assertions looking in pageSrc find the markup
    const pageSrcRegex = /const pageSrc = existsSync\(PAGE\) \? readFileSync\(PAGE, 'utf-8'\) : '';/g;
    if (pageSrcRegex.test(content)) {
        content = content.replace(pageSrcRegex, `const pageSrc_orig = existsSync(PAGE) ? readFileSync(PAGE, 'utf-8') : '';
const arenaSrc_tmp = existsSync(ARENA) ? readFileSync(ARENA, 'utf-8') : '';
const hudSrc_tmp = existsSync(HUD) ? readFileSync(HUD, 'utf-8') : '';
const pageSrc = pageSrc_orig + arenaSrc_tmp + hudSrc_tmp;`);
        
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated pageSrc definition in ${file}`);
    }
}
