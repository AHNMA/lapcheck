const https = require('https');
https.get('https://api.openf1.org/v1/sessions?year=2026', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const sessions = JSON.parse(data);
    const missing = sessions.filter(s => !s.date_start);
    console.log('Missing date_start:', missing.length);
  });
});
