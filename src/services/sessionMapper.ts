// Map typical OpenF1 API session names to FastF1 standard abbreviations
export function mapSessionName(sessionName: string): string {
  const name = sessionName.toUpperCase();
  if (name.includes('PRACTICE 1') || name === 'FP1') return 'FP1';
  if (name.includes('PRACTICE 2') || name === 'FP2') return 'FP2';
  if (name.includes('PRACTICE 3') || name === 'FP3') return 'FP3';
  if (name.includes('SPRINT SHOOTOUT') || name.includes('SPRINT QUALIFYING') || name === 'SQ') return 'SQ';
  if (name.includes('QUALIFYING') || name === 'Q') return 'Q';
  if (name.includes('SPRINT') || name === 'S') return 'S';
  if (name.includes('RACE') || name === 'R') return 'R';
  return sessionName;
}
