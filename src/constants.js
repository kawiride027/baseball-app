export const POSITIONS = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'LCF', 'CF', 'RCF', 'RF'];
export const INNINGS = 6;
export const PIN_CODE = '999';

export const POSITION_COORDS = {
  LF:  { x: 60,  y: 75 },
  LCF: { x: 155, y: 45 },
  CF:  { x: 250, y: 28 },
  RCF: { x: 345, y: 45 },
  RF:  { x: 440, y: 75 },
  SS:  { x: 170, y: 195 },
  '2B': { x: 330, y: 195 },
  '3B': { x: 80,  y: 290 },
  P:   { x: 250, y: 230 },
  '1B': { x: 420, y: 290 },
  C:   { x: 250, y: 430 },
};

export const POSITION_LABELS = {
  P: 'Pitcher',
  C: 'Catcher',
  '1B': '1st Base',
  '2B': '2nd Base',
  SS: 'Shortstop',
  '3B': '3rd Base',
  LF: 'Left Field',
  LCF: 'Left Center',
  CF: 'Center Field',
  RCF: 'Right Center',
  RF: 'Right Field',
};

export function ordinalInning(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export const STORAGE_KEY = 'baseball_app_data';

export const DEFAULT_DATA = {
  teamName: '',
  roster: [],
  schedule: [],
  games: {},
  activeGameId: null,
  viewingInning: 1,
};
