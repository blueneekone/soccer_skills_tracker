const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

async function getActivities(id) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const res = await fetch(`https://jules.googleapis.com/v1alpha/${id}/activities`, { headers });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

getActivities('sessions/11601636368990897826');
