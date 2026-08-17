const JULES_API_KEY = process.env.JULES_API_KEY;

async function replySession1() {
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': JULES_API_KEY
  };

  const payload = {
    prompt: 'Your understanding is 100% accurate across all 3 areas. Please proceed immediately with executing the refactor: lazy-load database connections inside handler blocks, enforce the 80-line limit per function, rename exists/get in firestore.rules to checkDocExists/fetchDoc with strict clubId/teamId assertions, and align schedules.startTimestamp, subscriptionStatus, users.fcmTokens, and checkr_status == "clear". Create the PR once tests are 100% green.'
  };

  console.log('Sending approval to Session 1 (Architect Backend Recovery)...');
  const res = await fetch(`https://jules.googleapis.com/v1alpha/sessions/2560789134166793641:sendMessage`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Response:', JSON.stringify(data, null, 2));
}

replySession1();
