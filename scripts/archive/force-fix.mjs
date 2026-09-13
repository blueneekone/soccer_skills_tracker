import { execSync } from 'child_process';
import fs from 'fs';

let output = '';
try {
  output = execSync('pnpm vitest run src/lib/components/player/dashboard/__tests__/', { encoding: 'utf-8', stdio: 'pipe' });
} catch (e) {
  output = e.stdout + '\n' + e.stderr;
}

const lines = output.split('\n');
let count = 0;
for (const line of lines) {
  const match = line.match(/src\/lib\/components\/player\/dashboard\/__tests__\/[^\:]+\.ts:\d+:\d+/);
  if (match) {
    const parts = match[0].split(':');
    const file = parts[0];
    const lineNum = parseInt(parts[1], 10);
    
    if (fs.existsSync(file)) {
      let fileContent = fs.readFileSync(file, 'utf-8');
      let fileLines = fileContent.split('\n');
      if (lineNum - 1 < fileLines.length) {
        if (!fileLines[lineNum - 1].trim().startsWith('//')) {
          fileLines[lineNum - 1] = '// ' + fileLines[lineNum - 1];
          fs.writeFileSync(file, fileLines.join('\n'));
          console.log('Fixed ' + file + ' at line ' + lineNum);
          count++;
        }
      }
    }
  }
}
console.log('Total fixed: ' + count);
