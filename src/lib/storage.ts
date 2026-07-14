// M11-1: localStorage 持久化 + debounce + schemaVersion 迁移
export const STORAGE_KEY = 'zizuo-app-state';
export const SCHEMA_VERSION = 2;

export interface StoredState<T> {
  schemaVersion: number;
  data: T;
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultAdapter(): StorageAdapter | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  return window.localStorage;
}

/** 立即读取并按 schemaVersion 校验，若不匹配则清空并返回 null */
export function loadState<T>(
  storage: StorageAdapter | null = defaultAdapter(),
  key: string = STORAGE_KEY,
): T | null {
  if (!storage) return null;
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredState<T>;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      storage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

/** 立即写入（不 debounce，仅供测试/初始化调用） */
export function saveState<T>(
  data: T,
  storage: StorageAdapter | null = defaultAdapter(),
  key: string = STORAGE_KEY,
  onError?: (err: unknown) => void,
): boolean {
  if (!storage) return false;
  const payload: StoredState<T> = { schemaVersion: SCHEMA_VERSION, data };
  try {
    storage.setItem(key, JSON.stringify(payload));
    return true;
  } catch (err) {
    onError?.(err);
    return false;
  }
}

export interface DebouncedSaver<T> {
  (data: T): void;
  flush(): void;
  cancel(): void;
}

/**
 * 生成 debounce 的 save 函数：连续多次调用只在最后一次后 delay ms 落盘。
 * QuotaExceededError 通过 onError 回调抛出。
 */
export function createDebouncedSaver<T>(
  delay: number = 500,
  storage: StorageAdapter | null = defaultAdapter(),
  key: string = STORAGE_KEY,
  onError?: (err: unknown) => void,
): DebouncedSaver<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: T | undefined;

  const flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (pending !== undefined) {
      saveState(pending, storage, key, onError);
      pending = undefined;
    }
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    pending = undefined;
  };

  const saver = ((data: T) => {
    pending = data;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, delay);
  }) as DebouncedSaver<T>;
  saver.flush = flush;
  saver.cancel = cancel;
  return saver;
}

/** 清空持久化数据（用于测试与重置） */
export function clearStoredState(
  storage: StorageAdapter | null = defaultAdapter(),
  key: string = STORAGE_KEY,
): void {
  if (!storage) return;
  storage.removeItem(key);
}
