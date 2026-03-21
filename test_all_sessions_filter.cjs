const https = require('https');
https.get('https://api.letthemrace.net/sessions/2024/Australian%20Grand%20Prix', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const now = new Date();
    const pastSessions = json.sessions.filter(s => new Date(s.session_date.replace(' ', 'T')) <= now).sort((a, b) => new Date(a.session_date.replace(' ', 'T')).getTime() - new Date(b.session_date.replace(' ', 'T')).getTime());
    console.log(pastSessions);
  });
});
