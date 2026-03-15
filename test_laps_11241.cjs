const https = require('https');
https.get('https://api.openf1.org/v1/laps?session_key=11241', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Response:', data);
  });
});
