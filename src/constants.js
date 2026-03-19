export const POSITIONS = ['P', 'C', '1B', '2B', 'SS', '3B', 'LF', 'LCF', 'CF', 'RCF', 'RF'];
export const INNINGS = 6;
export const PIN_CODE = '999';

export const POSITION_COORDS = {
  LF:  { x: 74,  y: 63 },
  LCF: { x: 192, y: 38 },
  CF:  { x: 310, y: 34 },
  RCF: { x: 428, y: 38 },
  RF:  { x: 546, y: 63 },
  SS:  { x: 195, y: 155 },
  '2B': { x: 425, y: 155 },
  '3B': { x: 99,  y: 242 },
  P:   { x: 310, y: 200 },
  '1B': { x: 521, y: 242 },
  C:   { x: 310, y: 358 },
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
export const ROLE_KEY = 'baseball_app_role';
export const ROLES = { COACH: 'coach', PARENT: 'parent' };

export const DEFAULT_DATA = {
  teamName: '',
  roster: [],
  schedule: [],
  games: {},
  activeGameId: null,
  viewingInning: 1,
};
