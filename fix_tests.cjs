const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/bento-span-8/g, 'tw-col-span-8');
  content = content.replace(/bento-span-4/g, 'tw-col-span-4');
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    changed++;
  }
}
console.log('Modified ' + changed + ' files.');
