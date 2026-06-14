import { create } from "zustand";
import type { CVData } from "../types";

export interface CVUndoState {
  /** Stack of previous CV snapshots (most recent at the end). */
  stack: CVData[];
  /** Maximum number of snapshots to keep. */
  limit: number;

  /** Push a snapshot onto the undo stack. */
  push: (snapshot: CVData) => void;
  /** Clear all stored snapshots. */
  clear: () => void;

  /**
   * Pops the latest snapshot and returns the new current value.
   * If stack is empty, returns the provided fallback.
   */
  undoTo: (fallback: CVData) => CVData;
}

const LIMIT_DEFAULT = 20;

export const useCVUndoStore = create<CVUndoState>((set, get) => ({
  stack: [],
  limit: LIMIT_DEFAULT,

  push: (snapshot) => {
    const { stack, limit } = get();
    // avoid pushing identical references/values where possible
    // (caller can also decide when to push)
    const next = [...stack, snapshot];
    const trimmed =
      next.length > limit ? next.slice(next.length - limit) : next;
    set({ stack: trimmed });
  },

  clear: () => {
    set({ stack: [] });
  },

  undoTo: (fallback) => {
    const { stack } = get();
    if (stack.length === 0) return fallback;
    const nextStack = stack.slice(0, -1);
    const prev = stack[stack.length - 1];
    set({ stack: nextStack });
    return prev;
  },
}));
