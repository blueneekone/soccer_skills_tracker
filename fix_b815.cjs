const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/routes/(app)/player/dashboard/+page.svelte',
  'src/routes/(app)/player/dashboard/MemoryCapsule.svelte',
  'src/routes/(app)/player/workout/+page.svelte',
  'src/routes/(app)/director/events/+page.svelte',
  'src/routes/(app)/director/dashboard/IntakePanopticon.svelte',
  'src/routes/(app)/director/dashboard/VpcPanopticon.svelte',
  'src/routes/(app)/messages/+page.svelte',
  'src/routes/(app)/director/uplinks/+page.svelte'
];

for (const relPath of filesToFix) {
  const fullPath = path.join(__dirname, relPath);
  if (!fs.existsSync(fullPath)) {
      console.log(`Skipping missing file: ${relPath}`);
      continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  const effectRegex = /\$effect\(\(\)\s*=>\s*\{/g;
  let match;
  let matches = [];
  while ((match = effectRegex.exec(content)) !== null) {
      matches.push(match);
  }

  let modified = false;
  for (let i = matches.length - 1; i >= 0; i--) {
      const startIdx = matches[i].index;
      const endIdx = i < matches.length - 1 ? matches[i+1].index : content.length;
      const block = content.substring(startIdx, endIdx);
      
      if (block.includes('query(') || block.includes('doc(db') || block.includes('collection(db')) {
          if (!block.includes('if (!db || !authStore.isAuthenticated) return;')) {
              const insertIdx = startIdx + matches[i][0].length;
              content = content.substring(0, insertIdx) + '\n\t\tif (!db || !authStore.isAuthenticated) return;' + content.substring(insertIdx);
              modified = true;
          }
      }
  }

  if (modified) {
      // Ensure db and authStore are imported if we use them
      if (!content.includes('authStore.isAuthenticated')) {
          if (!content.includes('import { authStore }')) {
              content = content.replace('<script lang="ts">', '<script lang="ts">\n\timport { authStore } from \'$lib/stores/auth.svelte.js\';');
          }
      }
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`Patched ${relPath}`);
  }
}
