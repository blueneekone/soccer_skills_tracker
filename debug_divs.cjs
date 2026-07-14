const fs = require('fs');

const content = fs.readFileSync('c:\\Users\\ewaec\\Documents\\Soccer Skills Developent Tracker\\soccer_skills_tracker\\src\\lib\\components\\shell\\EnterpriseConsoleShell.svelte', 'utf-8');

const lines = content.split('\n');
let divCount = 0;

for (let i = 184; i < lines.length; i++) {
  const line = lines[i];
  
  // simple match, assumes no tricky stuff
  const opens = (line.match(/<div(\s|>)/g) || []).length;
  const closes = (line.match(/<\/div>/g) || []).length;
  
  divCount += opens;
  divCount -= closes;
  
  if (opens > 0 || closes > 0) {
    console.log(`Line ${i + 1}: ${line.trim()} | opens=${opens} closes=${closes} | balance=${divCount}`);
  }
}
