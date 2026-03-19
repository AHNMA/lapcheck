const now = new Date();
const sessions = [
  {
    session_identifier: 'Session1',
    session_name: 'Practice 1',
    session_date: '2026-03-06 12:30:00+11:00'
  },
  {
    session_identifier: 'Session2',
    session_name: 'Practice 2',
    session_date: '2026-03-06 16:00:00+11:00'
  },
  {
    session_identifier: 'Session3',
    session_name: 'Practice 3',
    session_date: '2026-03-07 12:30:00+11:00'
  },
  {
    session_identifier: 'Session4',
    session_name: 'Qualifying',
    session_date: '2026-03-07 16:00:00+11:00'
  },
  {
    session_identifier: 'Session5',
    session_name: 'Race',
    session_date: '2026-03-08 15:00:00+11:00'
  }
]

const pastSessions = sessions.filter(s => new Date(s.session_date.replace(' ', 'T')) <= now).sort((a, b) => new Date(a.session_date.replace(' ', 'T')).getTime() - new Date(b.session_date.replace(' ', 'T')).getTime());
console.log(pastSessions);
