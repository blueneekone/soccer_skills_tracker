const JULES_API_KEY = process.env.JULES_API_KEY || "AQ.Ab8RN6KiD4ulxJL4kcfUVp1_vk850a2NYe-BZCdQbfv5DdpI2A";

async function probe() {
  const endpoints = [
    'https://jules.googleapis.com/v1/sources',
    'https://jules.googleapis.com/v1alpha/sources',
    'https://jules.googleapis.com/v1/sessions',
    'https://jules.googleapis.com/v1alpha/sessions'
  ];

  for (const url of endpoints) {
    console.log(`\n--- Probing: ${url} ---`);
    try {
      const res = await fetch(url, {
        headers: {
          'X-Goog-Api-Key': JULES_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      console.log(`Status: ${res.status} ${res.statusText}`);
      const text = await res.text();
      console.log(`Body: ${text.slice(0, 500)}`);
    } catch (e) {
      console.error(`Error: ${e.message}`);
    }
  }
}

probe();
