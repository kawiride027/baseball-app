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
