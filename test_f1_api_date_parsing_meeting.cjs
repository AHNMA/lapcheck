const d = new Date("2026-03-08 00:00:00".replace(' ', 'T'));
console.log(d.toISOString());
const now = new Date();
console.log(d <= now);
