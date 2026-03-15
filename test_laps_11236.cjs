const https = require('https');
https.get('https://api.openf1.org/v1/laps?session_key=11236', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const laps = JSON.parse(data);
    console.log('Laps in 11236:', laps.length);
  });
});
