const fs = require('fs');
const glob = require('glob');

const files = glob.sync('functions/**/*.test.js');
let updatedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/process\.exit\(failed\s*>\s*0\s*\?\s*1\s*:\s*0\)/g, 'if (failed > 0) throw new Error("Test failed");');
  content = content.replace(/process\.exit\(1\)/g, 'throw new Error("Test failed")');
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log('Updated ' + file);
  }
}
console.log('Total files updated: ' + updatedCount);
