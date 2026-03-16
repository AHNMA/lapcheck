import { f1Service } from './src/services/f1Service.js';

async function test() {
  const data = await f1Service.getResults(2026, 'Australian Grand Prix', 'Race');
  console.log(data.map(d => ({ Abbreviation: d.Abbreviation, DriverNumber: d.DriverNumber })));
}

test();
