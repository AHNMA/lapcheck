const https = require('https');
https.get('https://api.openf1.org/v1/sessions?year=2026', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const sessions = JSON.parse(data);
    const now = new Date();
    const pastSessions = sessions.filter(s => new Date(s.date_start) <= now);
    console.log('Total sessions:', sessions.length);
    console.log('Past sessions:', pastSessions.length);
  });
});
