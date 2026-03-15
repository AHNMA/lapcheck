const https = require('https');
https.get('https://api.openf1.org/v1/meetings?year=2024', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const meetings = JSON.parse(data);
    console.log(meetings.map(m => ({ key: m.meeting_key, name: m.meeting_name, start: m.date_start })));
  });
});
