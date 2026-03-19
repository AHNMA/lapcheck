const now = new Date();
const sessions = [
  {
    session_identifier: 'Session1',
    session_name: 'Practice 1',
    session_date: '2026-03-13 11:30:00+08:00'
  },
  {
    session_identifier: 'Session2',
    session_name: 'Sprint Qualifying',
    session_date: '2026-03-13 15:30:00+08:00'
  },
  {
    session_identifier: 'Session3',
    session_name: 'Sprint',
    session_date: '2026-03-14 11:00:00+08:00'
  },
  {
    session_identifier: 'Session4',
    session_name: 'Qualifying',
    session_date: '2026-03-14 15:00:00+08:00'
  },
  {
    session_identifier: 'Session5',
    session_name: 'Race',
    session_date: '2026-03-15 15:00:00+08:00'
  }
];

const filtered = sessions.filter(s => new Date(s.session_date.replace(' ', 'T')) <= now).sort((a, b) => new Date(a.session_date.replace(' ', 'T')).getTime() - new Date(b.session_date.replace(' ', 'T')).getTime());
console.log(filtered);
