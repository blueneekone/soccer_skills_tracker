const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

async function sendMessage(sessionId, msg) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const payload = {
    prompt: msg
  };

  console.log(`Sending response to Jules session ${sessionId}...`);
  const res = await fetch(`https://jules.googleapis.com/v1alpha/${sessionId}:sendMessage`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

sendMessage(
  'sessions/11601636368990897826',
  'Please proceed immediately with executing the complete implementation plan across all 5 areas per the blueprint specifications. Follow strict TDD, ensure B815 guards, untrack closures, and proxy snapshots are thoroughly verified, and submit the Pull Request once all tests are 100% green.'
);
