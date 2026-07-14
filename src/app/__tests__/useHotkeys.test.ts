// M5-3: useHotkeys 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { useHotkeys } from '../useHotkeys';
import { useHistoryStore, resetHistoryStore } from '@/stores/history';
import { useUiStore } from '@/stores/ui';
import { useVenueStore, resetVenueStore } from '@/stores/venue';
import type { Command } from '@/types';

function makeCmd(state: { v: number }, before: number, after: number): Command {
  return {
    type: 'move',
    description: '',
    execute() {
      state.v = after;
    },
    undo() {
      state.v = before;
    },
  };
}

describe('useHotkeys', () => {
  beforeEach(() => {
    resetHistoryStore();
    resetVenueStore();
    useUiStore.getState().reset();
  });

  it('Ctrl+Z triggers store.undo', () => {
    const state = { v: 0 };
    useHistoryStore.getState().push(makeCmd(state, 0, 5));
    renderHook(() => useHotkeys());
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    expect(state.v).toBe(0);
  });

  it('Ctrl+Y triggers store.redo', () => {
    const state = { v: 0 };
    useHistoryStore.getState().push(makeCmd(state, 0, 5));
    useHistoryStore.getState().undo();
    renderHook(() => useHotkeys());
    fireEvent.keyDown(window, { key: 'y', ctrlKey: true });
    expect(state.v).toBe(5);
  });

  it('Esc clears selectedId', () => {
    useUiStore.getState().setSelectedId('some-id');
    renderHook(() => useHotkeys());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().selectedId).toBeNull();
  });

  it('Delete removes selected element from venue', () => {
    useVenueStore.getState().addElement({
      id: 'door-1',
      type: 'door',
      x: 1,
      y: 0,
      width: 0.9,
      height: 0.05,
      rotation: 0,
      locked: false,
    });
    useUiStore.getState().setSelectedId('door-1');
    renderHook(() => useHotkeys());
    fireEvent.keyDown(window, { key: 'Delete' });
    expect(useVenueStore.getState().venue.elements.length).toBe(0);
  });

  it('Arrow keys nudge selected element by 0.1m', () => {
    useVenueStore.getState().addElement({
      id: 'door-1',
      type: 'door',
      x: 1,
      y: 0,
      width: 0.9,
      height: 0.05,
      rotation: 0,
      locked: false,
    });
    useUiStore.getState().setSelectedId('door-1');
    renderHook(() => useHotkeys());
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    const el = useVenueStore.getState().venue.elements[0];
    expect(el.x).toBeCloseTo(1.1, 5);
  });
});
