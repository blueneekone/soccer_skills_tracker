import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('src/lib/components/player/dashboard/__tests__/*.test.ts');
let count = 0;
for (const f of files) {
  let content = fs.readFileSync(f, 'utf-8');
  if (content.includes('arenaSrc') && !content.includes('const arenaSrc')) {
    content = content.replace(/const pageSrc = readFileSync\(PAGE, 'utf-8'\);/g, 
      "const pageSrc = readFileSync(PAGE, 'utf-8');\nconst arenaSrc = readFileSync(ARENA, 'utf-8');\nconst hudSrc = readFileSync(HUD, 'utf-8');"
    );
    fs.writeFileSync(f, content);
    console.log('Fixed imports in ' + f);
    count++;
  }
}
console.log('Total fixed: ' + count);
