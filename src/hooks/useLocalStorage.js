import { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEY, DEFAULT_DATA } from '../constants';

const MAX_UNDO_STACK = 30;

export function useAppData() {
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
        const newGames = imported.map((g, i) => ({
          id: 'g' + (Date.now() + i) + Math.random().toString(36).slice(2, 6),
          date: g.date || '',
          opponent: g.opponent || '',
        }));
        setDataRaw((prev) => {
          if (prev.schedule.length > 0) return prev;
          return { ...prev, schedule: newGames };
        });
      })
      .catch(() => {});
  }, []);

  const [undoStack, setUndoStack] = useState([]);
  const skipUndo = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [data]);

  const updateData = useCallback((updater) => {
    setDataRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      // Push previous state onto undo stack (unless we're undoing)
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
