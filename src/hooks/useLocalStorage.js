import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc, disableNetwork, enableNetwork } from 'firebase/firestore';
import { db } from '../firebase';
import { STORAGE_KEY, DEFAULT_DATA, ROLE_KEY, ROLES } from '../constants';

const MAX_UNDO_STACK = 30;
const TEAM_CODE_KEY = 'baseball_team_code';

// Generate a memorable team code like "HAWKS42"
const CODE_WORDS = [
  'HAWKS','TIGERS','BEARS','EAGLES','LIONS','WOLVES','SHARKS','COBRAS',
  'STORM','THUNDER','BLAZE','ROCKETS','VIPERS','FALCONS','PANTHERS',
  'BULLS','RAMS','KNIGHTS','BLAZERS','COMETS','MAVS','GIANTS','ACES',
  'BOLTS','FURY','CRUSH','SPARK','RUSH','STRIKE','SURGE',
];
export function generateTeamCode() {
  const word = CODE_WORDS[Math.floor(Math.random() * CODE_WORDS.length)];
  const num = Math.floor(Math.random() * 90 + 10); // 10-99
  return word + num;
}

// Get/set team code from localStorage
export function getStoredTeamCode() {
  return localStorage.getItem(TEAM_CODE_KEY) || null;
}

export function setStoredTeamCode(code) {
  localStorage.setItem(TEAM_CODE_KEY, code);
}

export function clearStoredTeamCode() {
  localStorage.removeItem(TEAM_CODE_KEY);
}

// Get/set role from localStorage
export function getStoredRole() {
  return localStorage.getItem(ROLE_KEY) || ROLES.COACH;
}

export function setStoredRole(role) {
  localStorage.setItem(ROLE_KEY, role);
}

export function clearStoredRole() {
  localStorage.removeItem(ROLE_KEY);
}

export function useAppData(role) {
  const teamCode = getStoredTeamCode();

  // Initialize from localStorage cache (fast first paint)
  const [data, setDataRaw] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_DATA, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to parse localStorage data:', e);
    }
    return { ...DEFAULT_DATA };
  });

  // Auto-load schedule.json on first run if no schedule exists
  const scheduleLoaded = useRef(false);
  useEffect(() => {
    if (scheduleLoaded.current) return;
    scheduleLoaded.current = true;
    if (data.schedule.length > 0) return;
    fetch(import.meta.env.BASE_URL + 'schedule.json')
      .then((r) => r.ok ? r.json() : null)
      .then((imported) => {
        if (!Array.isArray(imported) || imported.length === 0) return;
        const newGames = [];
        const gameData = {};
        imported.forEach((g, i) => {
          const id = 'g' + (Date.now() + i) + Math.random().toString(36).slice(2, 6);
          newGames.push({ id, date: g.date || '', opponent: g.opponent || '' });
          if (g.result && g.scoreUs != null && g.scoreThem != null) {
            gameData[id] = {
              completed: true,
              score: { us: g.scoreUs, them: g.scoreThem },
              result: g.result,
              assignments: {},
              battingOrder: [],
              atBat: { currentInning: 1, isAtBat: false, lastOutPlayerId: null, nextBatterIndex: 0 },
            };
          }
        });
        setDataRaw((prev) => {
          if (prev.schedule.length > 0) return prev;
          return { ...prev, schedule: newGames, games: { ...prev.games, ...gameData } };
        });
      })
      .catch(() => {});
  }, []);

  const [undoStack, setUndoStack] = useState([]);
  const skipUndo = useRef(false);
  const isRemoteUpdate = useRef(false);

  // --- Firestore real-time sync ---
  useEffect(() => {
    if (!teamCode) return;

    const docRef = doc(db, 'teams', teamCode);
    const unsubscribe = onSnapshot(docRef, { includeMetadataChanges: true }, (snapshot) => {
      if (snapshot.exists()) {
        const remoteData = snapshot.data();
        // Only update if the remote data is different (avoid loops)
        isRemoteUpdate.current = true;
        setDataRaw((prev) => {
          const merged = { ...DEFAULT_DATA, ...remoteData };
          // Check if data actually changed to avoid unnecessary re-renders
          if (JSON.stringify(prev) === JSON.stringify(merged)) return prev;
          return merged;
        });
      }
    }, (error) => {
      console.warn('Firestore sync error (working offline):', error.message);
    });

    // Force Firestore to reconnect when the tab/app becomes visible again
    // (mobile browsers kill WebSocket connections when backgrounded)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        disableNetwork(db).then(() => enableNetwork(db)).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [teamCode]);

  // --- Save to localStorage + Firestore on every change ---
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }

    // Push to Firestore (skip if this change came from Firestore)
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false;
      return;
    }

    if (teamCode && role !== ROLES.PARENT) {
      const docRef = doc(db, 'teams', teamCode);
      setDoc(docRef, data, { merge: true }).catch((err) => {
        console.warn('Firestore write failed (offline, will sync later):', err.message);
      });
    }
  }, [data, teamCode]);

  const updateData = useCallback((updater) => {
    setDataRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      if (!skipUndo.current) {
        setUndoStack((stack) => {
          const newStack = [...stack, prev];
          if (newStack.length > MAX_UNDO_STACK) {
            return newStack.slice(newStack.length - MAX_UNDO_STACK);
          }
          return newStack;
        });
      }
      skipUndo.current = false;
      return next;
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const newStack = [...stack];
      const previous = newStack.pop();
      skipUndo.current = true;
      setDataRaw(previous);
      return newStack;
    });
  }, []);

  const canUndo = undoStack.length > 0;

  // Parents get read-only access — no-op writers, no undo
  if (role === ROLES.PARENT) {
    return [data, () => {}, () => {}, false];
  }

  return [data, updateData, undo, canUndo];
}
