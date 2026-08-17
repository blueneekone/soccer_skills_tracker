const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

const SESSIONS = [
  { title: 'Architect Backend Recovery (v2)', id: 'sessions/2560789134166793641' },
  { title: 'Frontend Hydration Recovery (v2)', id: 'sessions/11601636368990897826' },
  { title: 'CSO WebAuthn Origin Binding (v2)', id: 'sessions/10986580400646211865' }
];

async function checkSessions() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  console.log('📊 Querying Google Jules Cloud VM Session Statuses...\n');
  for (const s of SESSIONS) {
    try {
      const res = await fetch(`https://jules.googleapis.com/v1alpha/${s.id}`, { headers });
      const data = await res.json();
      const state = data.state || 'IN_PROGRESS';
      console.log(`• [${s.title}] -> State: ${state}`);
      if (data.pullRequest) {
        console.log(`  🔗 PR: ${data.pullRequest.url || JSON.stringify(data.pullRequest)}`);
      }
    } catch (e) {
      console.error(`  ❌ Error querying ${s.id}:`, e.message);
    }
  }
}

checkSessions();
