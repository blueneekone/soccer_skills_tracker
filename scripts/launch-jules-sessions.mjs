import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

const WORKFLOW_FILES = [
  {
    title: 'Architect Backend Recovery (v2)',
    file: path.join(REPO_ROOT, '.agents/workflows/jules-builds/architect-backend-recovery-v2.md')
  },
  {
    title: 'Frontend Hydration Recovery (v2)',
    file: path.join(REPO_ROOT, '.agents/workflows/jules-builds/frontend-hydration-recovery-v2.md')
  },
  {
    title: 'CSO WebAuthn Origin Binding (v2)',
    file: path.join(REPO_ROOT, '.agents/workflows/jules-builds/cso-webauthn-origin-binding-v2.md')
  }
];

async function launch() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  console.log('🔍 Querying Jules v1alpha API for connected sources...');
  try {
    const sourcesRes = await fetch('https://jules.googleapis.com/v1alpha/sources', { headers });
    const sourcesData = await sourcesRes.json();

    if (!sourcesRes.ok) {
      console.error('❌ Failed to fetch Jules sources:', JSON.stringify(sourcesData, null, 2));
      process.exit(1);
    }

    const sources = sourcesData.sources || [];
    console.log(`✅ Found ${sources.length} connected source(s).`);

    const targetSource = sources.find(s => 
      s.name.includes('soccer_skills_tracker') ||
      s.githubRepo?.repo === 'soccer_skills_tracker'
    ) || sources[0];

    if (!targetSource) {
      console.error('❌ No matching source found for soccer_skills_tracker.');
      process.exit(1);
    }

    console.log(`🚀 Using target source: ${targetSource.name}`);

    for (const wf of WORKFLOW_FILES) {
      if (!fs.existsSync(wf.file)) {
        console.warn(`⚠️ File not found: ${wf.file}`);
        continue;
      }

      const promptContent = fs.readFileSync(wf.file, 'utf-8');
      console.log(`\n📡 Dispatching session: "${wf.title}" to Jules...`);

      const sessionPayload = {
        prompt: promptContent,
        title: wf.title,
        sourceContext: {
          source: targetSource.name,
          githubRepoContext: {
            startingBranch: 'dev'
          }
        }
      };

      const sessionRes = await fetch('https://jules.googleapis.com/v1alpha/sessions', {
        method: 'POST',
        headers,
        body: JSON.stringify(sessionPayload)
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok) {
        console.error(`❌ Failed to create session for ${wf.title}:`, JSON.stringify(sessionData, null, 2));
        
        // Try fallback payload structure
        const fallbackPayload = {
          prompt: promptContent,
          title: wf.title,
          source: targetSource.name,
          startingBranch: 'dev'
        };
        const fallbackRes = await fetch('https://jules.googleapis.com/v1alpha/sessions', {
          method: 'POST',
          headers,
          body: JSON.stringify(fallbackPayload)
        });
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          console.log(`🎉 Session launched (fallback)! Name: ${fallbackData.name || fallbackData.id}`);
        } else {
          console.error(`❌ Fallback failed too:`, JSON.stringify(fallbackData, null, 2));
        }
      } else {
        console.log(`🎉 Session successfully launched! Name: ${sessionData.name || sessionData.id}`);
      }
    }

    console.log('\n🌟 All 3 workflows dispatched to Google Jules! The local auto-merge daemon is monitoring for PRs.');
  } catch (err) {
    console.error('❌ Error communicating with Jules API:', err);
    process.exit(1);
  }
}

launch();
