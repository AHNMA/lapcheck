const http = require('http');
http.get('http://178.104.33.41:8000/meetings/2026', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const now = new Date();
    const pastMeetings = json.meetings.filter(m => new Date(m.event_date.replace(' ', 'T')) <= now);
    console.log(`Found ${pastMeetings.length} past meetings out of ${json.meetings.length}`);
    console.log("Last past meeting:", pastMeetings[pastMeetings.length - 1]);
  });
});
