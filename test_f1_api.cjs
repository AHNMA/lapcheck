const https = require('https');
https.get('https://api.letthemrace.net/meetings/2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(json.meetings.slice(0, 3));
    console.log(json.meetings.slice(-3));
  });
});
