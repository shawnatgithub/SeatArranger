// M4-4: History Store — Command 栈，30 步上限，undo/redo
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Command } from '@/types';

export const HISTORY_LIMIT = 30;

interface HistoryState {
  past: Command[];
  future: Command[];

  /** 执行命令并入栈；超过上限丢弃最早 */
  push: (cmd: Command) => void;
  undo: () => boolean;
  redo: () => boolean;
  clear: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    past: [],
    future: [],

    push: (cmd) => {
      cmd.execute();
      set((s) => {
        s.past.push(cmd);
        // 新操作会清空 redo
        s.future = [];
        // 超上限时丢弃最早
        while (s.past.length > HISTORY_LIMIT) s.past.shift();
      });
    },

    undo: () => {
      const { past } = get();
      if (past.length === 0) return false;
      const cmd = past[past.length - 1];
      cmd.undo();
      set((s) => {
        s.past.pop();
        s.future.push(cmd);
      });
      return true;
    },

    redo: () => {
      const { future } = get();
      if (future.length === 0) return false;
      const cmd = future[future.length - 1];
      cmd.execute();
      set((s) => {
        s.future.pop();
        s.past.push(cmd);
      });
      return true;
    },

    clear: () =>
      set((s) => {
        s.past = [];
        s.future = [];
      }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  })),
);

export function resetHistoryStore(): void {
  useHistoryStore.setState({ past: [], future: [] });
}
