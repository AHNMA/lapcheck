const http = require('http');
http.get('http://178.104.33.41:8000/sessions/2026/Chinese%20Grand%20Prix', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(json.sessions);
  });
});
