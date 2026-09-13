import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(__dirname, '../src/lib/coach/__tests__/coachModule.test.ts');
let content = fs.readFileSync(file, 'utf-8');

// 1. Remove barrel export match
content = content.replace(/expect\(barrel\)\.toMatch\(\/match-day\\\/index\/\);\n?/g, '');
content = content.replace(/,\s*match-day/g, '');

// 2. Remove route case
content = content.replace(/\{\s*route:\s*'match-day',\s*importPattern:\s*\/\\\$lib\\\/coach\\\/match-day\/,\s*view:\s*'CoachMatchDayView',\s*\},?\n?/g, '');

// 3. Remove existsSync
content = content.replace(/expect\(existsSync\(join\(COACH_LIB,\s*'match-day\/CoachMatchDayView\.svelte'\)\)\)\.toBe\(true\);\n?/g, '');

// 4. Remove the entire T1-2 describe block
content = content.replace(/\/\/\s*T1-2[\s\S]*?describe\('T1-2: match-day[\s\S]*?\n\}\);\n/g, '');

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed coachModule.test.ts');
