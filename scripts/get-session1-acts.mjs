const JULES_API_KEY = process.env.JULES_API_KEY;

async function getSession1Acts() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const res = await fetch(`https://jules.googleapis.com/v1alpha/sessions/2560789134166793641/activities`, { headers });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

getSession1Acts();
