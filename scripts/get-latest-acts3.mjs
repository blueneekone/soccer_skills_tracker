const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

async function getLatestActs3() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const res = await fetch(`https://jules.googleapis.com/v1alpha/sessions/10986580400646211865/activities`, { headers });
  const data = await res.json();
  const acts = data.activities || [];
  const latest = acts.slice(-2);
  console.log(JSON.stringify(latest, null, 2));
}

getLatestActs3();
