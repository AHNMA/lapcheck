import { f1Service } from './src/services/f1Service.js';

async function test() {
  const data = await f1Service.getAllLaps(2026, 'Australian Grand Prix', 'Race', 'RUS');
  console.log("Laps for RUS:", data.length);
}

test();
