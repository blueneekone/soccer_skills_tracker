const JULES_API_KEY = process.env.JULES_API_KEY;

async function replySession2() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const payload = {
    prompt: 'Please extract/re-export CarRideHome.svelte into a shared location like src/lib/components/compliance/CarRideHome.svelte (or src/lib/components/shared/CarRideHome.svelte) so both Parent and Player dashboards share the single canonical component. In player dashboard (+page.svelte), gate the match metrics analytics / VanguardProtocolPanel section behind the CarRideHome lockout when active, rendering the Atompunk Amber (#f59e0b) countdown card. Proceed with this implementation.'
  };

  console.log('Sending decision to Session 2 (Frontend Hydration Recovery)...');
  const res = await fetch(`https://jules.googleapis.com/v1alpha/sessions/11601636368990897826:sendMessage`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

replySession2();
