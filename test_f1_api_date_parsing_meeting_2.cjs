const now = new Date();
const d = new Date("2026-03-08 00:00:00".replace(' ', 'T'));
console.log(now.toISOString());
console.log(d.toISOString());
console.log(d <= now);
