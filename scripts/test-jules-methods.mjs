const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

async function testMethods() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const id = 'sessions/10986580400646211865';

  const res = await fetch(`https://jules.googleapis.com/v1alpha/${id}`, { headers });
  const data = await res.json();
  console.log('Session state:', data.state);
  console.log('Outputs:', JSON.stringify(data.outputs, null, 2));
}

testMethods();
