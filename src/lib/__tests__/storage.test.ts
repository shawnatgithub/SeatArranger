// M11-1: storage 持久化测试
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SCHEMA_VERSION,
  STORAGE_KEY,
  createDebouncedSaver,
  loadState,
  saveState,
  type StorageAdapter,
} from '../storage';

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

describe('storage', () => {
  describe('loadState / saveState', () => {
    it('写入后可读取', () => {
      const s = makeMemoryAdapter();
      saveState({ a: 1 }, s);
      expect(loadState(s)).toEqual({ a: 1 });
    });

    it('schemaVersion 不匹配时清空并返回 null', () => {
      const s = makeMemoryAdapter();
      s.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, data: { legacy: true } }));
      expect(loadState(s)).toBeNull();
      expect(s.getItem(STORAGE_KEY)).toBeNull();
    });

    it('损坏的 JSON 时移除并返回 null', () => {
      const s = makeMemoryAdapter();
      s.setItem(STORAGE_KEY, '{bad json');
      expect(loadState(s)).toBeNull();
      expect(s.getItem(STORAGE_KEY)).toBeNull();
    });

    it('QuotaExceededError 通过 onError 回调抛出', () => {
      const adapter: StorageAdapter = {
        getItem: () => null,
        setItem: () => {
          throw new DOMException('quota', 'QuotaExceededError');
        },
        removeItem: () => {},
      };
      const onError = vi.fn();
      const ok = saveState({ x: 1 }, adapter, STORAGE_KEY, onError);
      expect(ok).toBe(false);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('SCHEMA_VERSION 常量为 2', () => {
      expect(SCHEMA_VERSION).toBe(2);
    });
  });

  describe('createDebouncedSaver', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('连续调用只在最后一次后 delay 落盘', () => {
      const s = makeMemoryAdapter();
      const saver = createDebouncedSaver<{ v: number }>(500, s);
      saver({ v: 1 });
      saver({ v: 2 });
      saver({ v: 3 });
      expect(s.store.size).toBe(0);
      vi.advanceTimersByTime(499);
      expect(s.store.size).toBe(0);
      vi.advanceTimersByTime(1);
      expect(loadState(s)).toEqual({ v: 3 });
    });

    it('flush 立即落盘', () => {
      const s = makeMemoryAdapter();
      const saver = createDebouncedSaver<{ v: number }>(500, s);
      saver({ v: 42 });
      saver.flush();
      expect(loadState(s)).toEqual({ v: 42 });
    });

    it('cancel 取消未落盘的写入', () => {
      const s = makeMemoryAdapter();
      const saver = createDebouncedSaver<{ v: number }>(500, s);
      saver({ v: 42 });
      saver.cancel();
      vi.advanceTimersByTime(1000);
      expect(s.store.size).toBe(0);
    });
  });
});
