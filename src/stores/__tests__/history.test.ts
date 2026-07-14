// M4-4: History Store 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore, resetHistoryStore, HISTORY_LIMIT } from '../history';
import type { Command } from '@/types';

function makeMoveCommand(state: { value: number }, before: number, after: number): Command {
  return {
    type: 'move',
    description: `move ${before}→${after}`,
    execute() {
      state.value = after;
    },
    undo() {
      state.value = before;
    },
  };
}

describe('useHistoryStore', () => {
  beforeEach(() => resetHistoryStore());

  it('push → execute + track in past; future cleared', () => {
    const state = { value: 0 };
    useHistoryStore.getState().push(makeMoveCommand(state, 0, 5));
    expect(state.value).toBe(5);
    expect(useHistoryStore.getState().past.length).toBe(1);
    expect(useHistoryStore.getState().future.length).toBe(0);
  });

  it('3 moves then 3 undo returns to initial', () => {
    const state = { value: 0 };
    const store = useHistoryStore.getState();
    store.push(makeMoveCommand(state, 0, 1));
    store.push(makeMoveCommand(state, 1, 2));
    store.push(makeMoveCommand(state, 2, 3));
    expect(state.value).toBe(3);
    useHistoryStore.getState().undo();
    useHistoryStore.getState().undo();
    useHistoryStore.getState().undo();
    expect(state.value).toBe(0);
    expect(useHistoryStore.getState().canUndo()).toBe(false);
  });

  it('undo then redo restores value', () => {
    const state = { value: 0 };
    useHistoryStore.getState().push(makeMoveCommand(state, 0, 5));
    useHistoryStore.getState().undo();
    expect(state.value).toBe(0);
    useHistoryStore.getState().redo();
    expect(state.value).toBe(5);
  });

  it('drops oldest when exceeding HISTORY_LIMIT', () => {
    const state = { value: 0 };
    for (let i = 0; i < HISTORY_LIMIT + 5; i++) {
      useHistoryStore.getState().push(makeMoveCommand(state, i, i + 1));
    }
    expect(useHistoryStore.getState().past.length).toBe(HISTORY_LIMIT);
  });

  it('new push clears future stack', () => {
    const state = { value: 0 };
    useHistoryStore.getState().push(makeMoveCommand(state, 0, 1));
    useHistoryStore.getState().push(makeMoveCommand(state, 1, 2));
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().canRedo()).toBe(true);
    useHistoryStore.getState().push(makeMoveCommand(state, 1, 9));
    expect(useHistoryStore.getState().canRedo()).toBe(false);
  });
});
