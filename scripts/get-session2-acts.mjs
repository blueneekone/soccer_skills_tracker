const JULES_API_KEY = process.env.JULES_API_KEY;

async function getSession2Acts() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const res = await fetch(`https://jules.googleapis.com/v1alpha/sessions/11601636368990897826/activities`, { headers });
  const data = await res.json();
  const latest = data.activities[data.activities.length - 1];
  console.log(JSON.stringify(latest, null, 2));
}

getSession2Acts();
