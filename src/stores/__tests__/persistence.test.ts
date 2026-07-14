// M11-2: Store 订阅自动持久化 + 恢复测试
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEY, type StorageAdapter } from '@/lib/storage';
import {
  attachPersistence,
  detachPersistence,
  restoreFromStorage,
} from '../persistence';
import { useVenueStore } from '@/stores/venue';
import { useGuestStore } from '@/stores/guest';
import { useUiStore } from '@/stores/ui';

function makeMemoryAdapter(): StorageAdapter & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

describe('persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useGuestStore.setState({ guests: [], relations: [], ruleScene: 'corporate', unassignedIds: [] });
    useUiStore.setState({ currentStep: 1, previewMode: false, selectedId: null });
    useVenueStore.setState((s) => {
      s.venue = {
        ...s.venue,
        elements: [],
        tables: [],
      };
    });
  });

  afterEach(() => {
    detachPersistence();
    vi.useRealTimers();
  });

  it('订阅后 500ms 内 store 变化落盘', () => {
    const s = makeMemoryAdapter();
    attachPersistence({ storage: s });
    useUiStore.getState().setStep(3);
    expect(s.store.size).toBe(0);
    vi.advanceTimersByTime(500);
    expect(s.store.get(STORAGE_KEY)).toBeTruthy();
    const parsed = JSON.parse(s.store.get(STORAGE_KEY)!);
    expect(parsed.data.ui.currentStep).toBe(3);
  });

  it('restoreFromStorage 恢复 ui/guest/venue 状态', () => {
    const s = makeMemoryAdapter();
    // 预置状态并落盘
    useUiStore.getState().setStep(4);
    useGuestStore.getState().addGuest({
      id: 'g-restore',
      name: '测试人',
      tags: [],
      seatPinned: false,
      satisfaction: 'high',
    });
    attachPersistence({ storage: s });
    useUiStore.getState().setStep(5);
    vi.advanceTimersByTime(500);
    // 重置内存 store
    useGuestStore.setState({ guests: [], relations: [], ruleScene: 'corporate', unassignedIds: [] });
    useUiStore.getState().setStep(1);
    expect(useUiStore.getState().currentStep).toBe(1);
    // 恢复
    const restored = restoreFromStorage(s);
    expect(restored).toBe(true);
    expect(useUiStore.getState().currentStep).toBe(5);
    expect(useGuestStore.getState().guests.map((g) => g.id)).toContain('g-restore');
  });

  it('无数据时 restoreFromStorage 返回 false', () => {
    const s = makeMemoryAdapter();
    expect(restoreFromStorage(s)).toBe(false);
  });
});
