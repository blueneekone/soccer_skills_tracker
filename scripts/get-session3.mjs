const JULES_API_KEY = process.env.JULES_API_KEY;

async function getSession3() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const res = await fetch(`https://jules.googleapis.com/v1alpha/sessions/10986580400646211865`, { headers });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

getSession3();
