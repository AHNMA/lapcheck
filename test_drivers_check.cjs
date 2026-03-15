const https = require('https');

async function fetchDrivers(sessionKey) {
  return new Promise((resolve) => {
    https.get(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const drivers = JSON.parse(data);
          resolve(drivers.length > 0);
        } catch (e) {
          resolve(false);
        }
      });
    });
  });
}

async function test() {
  const sessions = [11235, 11236, 11240, 11241, 11245]; // 2026 Chinese GP
  for (const s of sessions) {
    const hasData = await fetchDrivers(s);
    console.log(`Session ${s} has data: ${hasData}`);
  }
}

test();
