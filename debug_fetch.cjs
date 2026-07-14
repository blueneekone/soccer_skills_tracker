const http = require('http');

http.get('http://localhost:5174/parent/dashboard', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log(`BODY LENGTH: ${body.length}`);
    if (res.statusCode === 500) console.log(body.substring(0, 2000));
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
