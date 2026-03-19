const d = new Date("2026-03-06 12:30:00+11:00".replace(' ', 'T'));
console.log(d.toISOString());
const now = new Date();
console.log(d <= now);
