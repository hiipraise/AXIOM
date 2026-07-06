import { create } from "zustand";
import type { CVData } from "../types";

export interface CVUndoState {
  /** Stack of previous CV snapshots (most recent at the end). */
  stack: CVData[];
  /** Redo stack — pushed onto when undoing. */
  redoStack: CVData[];
  /** Maximum number of snapshots to keep. */
  limit: number;

  /** Push a snapshot onto the undo stack. Clears redo stack on new pushes. */
  push: (snapshot: CVData) => void;
  /** Clear all stored snapshots and redo. */
  clear: () => void;

  /** Number of undo entries available. */
  stackSize: () => number;
  /** Number of redo entries available. */
  redoStackSize: () => number;

  /**
   * Pops the latest snapshot and returns the new current value.
   * If stack is empty, returns the provided fallback.
   * Pushes the current value onto the redo stack.
   */
  undoTo: (fallback: CVData) => CVData;
  /**
   * Pops the latest redo snapshot and returns it.
   * If redo stack is empty, returns the provided fallback.
   */
  redoTo: (fallback: CVData) => CVData;
}

const LIMIT_DEFAULT = 30;

export const useCVUndoStore = create<CVUndoState>((set, get) => ({
  stack: [],
  redoStack: [],
  limit: LIMIT_DEFAULT,

  push: (snapshot) => {
    const { stack, limit } = get();
    const next = [...stack, snapshot];
    const trimmed =
      next.length > limit ? next.slice(next.length - limit) : next;
    set({ stack: trimmed, redoStack: [] });
  },

  clear: () => {
    set({ stack: [], redoStack: [] });
  },

  stackSize: () => get().stack.length,
  redoStackSize: () => get().redoStack.length,

  undoTo: (fallback) => {
    const { stack, redoStack } = get();
    if (stack.length === 0) return fallback;
    const prev = stack[stack.length - 1];
    const nextStack = stack.slice(0, -1);
    set({ stack: nextStack, redoStack: [...redoStack, fallback] });
    return prev;
  },

  redoTo: (fallback) => {
    const { redoStack } = get();
    if (redoStack.length === 0) return fallback;
    const next = redoStack[redoStack.length - 1];
    const nextRedo = redoStack.slice(0, -1);
    set({ redoStack: nextRedo, stack: [...get().stack, fallback] });
    return next;
  },
}));
