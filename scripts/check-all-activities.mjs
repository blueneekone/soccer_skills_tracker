const JULES_API_KEY = process.env.JULES_API_KEY;

const SESSIONS = [
  { title: 'Architect Backend Recovery (v2)', id: 'sessions/2560789134166793641' },
  { title: 'Frontend Hydration Recovery (v2)', id: 'sessions/11601636368990897826' },
  { title: 'CSO WebAuthn Origin Binding (v2)', id: 'sessions/10986580400646211865' }
];

async function checkAllActivities() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  for (const s of SESSIONS) {
    console.log(`\n==================================================`);
    console.log(`📡 Activities for: ${s.title} (${s.id})`);
    console.log(`==================================================`);
    try {
      const res = await fetch(`https://jules.googleapis.com/v1alpha/${s.id}/activities`, { headers });
      const data = await res.json();
      const acts = data.activities || [];
      console.log(`Total activities: ${acts.length}`);
      for (const a of acts) {
        console.log(`[${a.originator}] at ${a.createTime}:`);
        if (a.agentMessaged) console.log(`  Agent: ${a.agentMessaged.agentMessage?.slice(0, 300)}...`);
        if (a.userMessaged) console.log(`  User: ${a.userMessaged.userMessage?.slice(0, 300)}...`);
      }
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

checkAllActivities();
