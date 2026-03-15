const https = require('https');
https.get('https://api.openf1.org/v1/sessions?meeting_key=1280', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const sessions = JSON.parse(data);
    console.log(sessions.map(s => ({ key: s.session_key, name: s.session_name, start: s.date_start })));
  });
});
