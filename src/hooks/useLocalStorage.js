import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { STORAGE_KEY, DEFAULT_DATA } from '../constants';

const MAX_UNDO_STACK = 30;
const TEAM_CODE_KEY = 'baseball_team_code';

// Generate a random team code like "HAWKS-7X3K"
export function generateTeamCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code.slice(0, 4) + '-' + code.slice(4);
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

export function useAppData() {
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
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
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

    return () => unsubscribe();
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

    if (teamCode) {
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

  return [data, updateData, undo, canUndo];
}
