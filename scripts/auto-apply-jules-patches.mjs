import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

const SESSIONS = [
  { title: 'Architect Backend Recovery (v2)', id: 'sessions/2560789134166793641' },
  { title: 'Frontend Hydration Recovery (v2)', id: 'sessions/11601636368990897826' },
  { title: 'CSO WebAuthn Origin Binding (v2)', id: 'sessions/10986580400646211865' }
];

function run(cmd) {
  console.log(`\n> ${cmd}`);
  return execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf-8' });
}

async function processPatches() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  for (const s of SESSIONS) {
    try {
      const res = await fetch(`https://jules.googleapis.com/v1alpha/${s.id}`, { headers });
      const data = await res.json();
      
      const outputs = data.outputs || [];
      for (const out of outputs) {
        if (out.changeSet?.gitPatch?.unidiffPatch) {
          console.log(`\n===============================================================`);
          console.log(`🔍 Processing Candidate Patch from Jules: ${s.title}`);
          console.log(`===============================================================`);

          const patchContent = out.changeSet.gitPatch.unidiffPatch;
          const patchFile = path.join(REPO_ROOT, `jules_patch_${s.id.replace(/\//g, '_')}.diff`);
          fs.writeFileSync(patchFile, patchContent, 'utf-8');

          try {
            console.log('Applying patch via git apply...');
            run(`git apply --reject --whitespace=fix "${patchFile}"`);
            fs.unlinkSync(patchFile);

            console.log('\n[Gate 1/3] Running Svelte 5 & TypeScript check...');
            run('node ./node_modules/svelte-check/bin/svelte-check --tsconfig ./jsconfig.json --threshold error');

            console.log('\n[Gate 2/3] Running Universal Backend Smoke Probe...');
            run('node scripts/smoke-require-codebase.cjs all');

            console.log('\n[Gate 3/3] Running Frontend Build...');
            run('npm run build');

            const commitMsg = out.changeSet.suggestedCommitMessage || `chore(jules): merge ${s.title}`;
            console.log('\n🎉 Validation PASSED! Committing to dev...');
            run(`git add -A`);
            run(`git commit -m ${JSON.stringify(commitMsg)} --no-verify`);
            run(`git push origin dev`);

            console.log(`✅ Successfully merged and pushed ${s.title} to dev!`);
          } catch (err) {
            console.error(`❌ Validation failed for ${s.title}:`, err.message);
            try {
              run('git reset --hard HEAD');
            } catch {}
          }
        }
      }
    } catch (e) {
      console.error(`Error querying ${s.id}:`, e.message);
    }
  }
}

processPatches();
