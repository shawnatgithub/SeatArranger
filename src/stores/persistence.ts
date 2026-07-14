// M11-2: Store 订阅变更自动持久化 + 启动恢复
import type { Guest, GuestRelation, RuleScene, Venue } from '@/types';
import { useVenueStore } from '@/stores/venue';
import { useGuestStore } from '@/stores/guest';
import { useUiStore, type StepId } from '@/stores/ui';
import { createDebouncedSaver, loadState, type StorageAdapter } from '@/lib/storage';

export interface PersistedSnapshot {
  venue: Venue;
  guests: Guest[];
  relations: GuestRelation[];
  ruleScene: RuleScene;
  ui: {
    currentStep: StepId;
    ruleScene: 'corporate' | 'government' | 'general';
    showGrid: boolean;
    showSnapLines: boolean;
  };
}

function snapshot(): PersistedSnapshot {
  const v = useVenueStore.getState().venue;
  const g = useGuestStore.getState();
  const u = useUiStore.getState();
  return {
    venue: v,
    guests: g.guests,
    relations: g.relations,
    ruleScene: g.ruleScene,
    ui: {
      currentStep: u.currentStep,
      ruleScene: u.ruleScene,
      showGrid: u.showGrid,
      showSnapLines: u.showSnapLines,
    },
  };
}

export function restoreFromStorage(storage?: StorageAdapter | null): boolean {
  const s = loadState<PersistedSnapshot>(storage);
  if (!s) return false;
  useVenueStore.setState((st) => {
    st.venue = s.venue;
  });
  useGuestStore.setState({
    guests: s.guests,
    relations: s.relations,
    ruleScene: s.ruleScene,
    unassignedIds: [],
  });
  useUiStore.setState({
    currentStep: s.ui.currentStep,
    ruleScene: s.ui.ruleScene,
    showGrid: s.ui.showGrid,
    showSnapLines: s.ui.showSnapLines,
  });
  return true;
}

let attached = false;
let unsubscribers: Array<() => void> = [];

export function attachPersistence(options: {
  delay?: number;
  storage?: StorageAdapter | null;
  onError?: (err: unknown) => void;
} = {}): () => void {
  if (attached) return detachPersistence;
  const saver = createDebouncedSaver<PersistedSnapshot>(
    options.delay ?? 500,
    options.storage,
    undefined,
    options.onError,
  );
  const trigger = () => saver(snapshot());
  unsubscribers = [
    useVenueStore.subscribe(trigger),
    useGuestStore.subscribe(trigger),
    useUiStore.subscribe(trigger),
  ];
  attached = true;
  return detachPersistence;
}

export function detachPersistence(): void {
  unsubscribers.forEach((u) => u());
  unsubscribers = [];
  attached = false;
}
