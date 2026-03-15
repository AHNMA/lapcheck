const https = require('https');
https.get('https://api.openf1.org/v1/drivers?session_key=11240', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const drivers = JSON.parse(data);
    console.log('Drivers in 11240:', drivers.length);
  });
});
