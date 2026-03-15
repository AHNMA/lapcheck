const https = require('https');

async function fetchLaps(sessionKey) {
  return new Promise((resolve) => {
    https.get(`https://api.openf1.org/v1/laps?session_key=${sessionKey}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const laps = JSON.parse(data);
          resolve(Array.isArray(laps) && laps.length > 0);
        } catch (e) {
          resolve(false);
        }
      });
    });
  });
}

async function test() {
  https.get('https://api.openf1.org/v1/sessions?year=2026', async (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', async () => {
      const sessions = JSON.parse(data);
      const now = new Date();
      for (const s of sessions) {
        const isFuture = new Date(s.date_start) > now;
        if (isFuture) {
          const hasData = await fetchLaps(s.session_key);
          if (hasData) {
            console.log(`FUTURE SESSION WITH DATA: ${s.session_key} - ${s.session_name}`);
          }
        }
      }
      console.log('Done checking future sessions.');
    });
  });
}

test();
