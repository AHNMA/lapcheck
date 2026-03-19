const http = require('http');
http.get('http://178.104.33.41:8000/meetings/2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(json.meetings.slice(0, 3));
    console.log(json.meetings.slice(-3));
  });
});
