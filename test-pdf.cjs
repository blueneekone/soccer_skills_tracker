const { extractPlayersFromPdfText } = require('./functions/src/domains/rosterIngestParse.js');

async function run() {
  try {
    const res = await extractPlayersFromPdfText('Name: Jane Doe\nEmail: jane@example.com\nJersey: 10', 'FAKE_KEY');
    console.log('Result:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}
run();
