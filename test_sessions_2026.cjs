const https = require('https');
https.get('https://api.letthemrace.net/sessions/2026/Australian%20Grand%20Prix', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(json.sessions);
  });
});
