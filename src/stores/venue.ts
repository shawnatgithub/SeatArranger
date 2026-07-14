// M4-1: Venue Store — 场地 CRUD + 桌子布局 + 锁定
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { MeetingType, Table, Venue, VenueElement } from '@/types';
import { autoLayout } from '@/domain/layout/autoLayout';
import { createVenueFromTemplate, type TemplateKey } from '@/domain/layout/templates';

interface VenueState {
  venue: Venue;

  // Venue-level
  loadTemplate: (key: TemplateKey) => void;
  resizeVenue: (width: number, height: number) => void;

  // Elements CRUD
  addElement: (el: VenueElement) => void;
  updateElement: (id: string, patch: Partial<VenueElement>) => void;
  removeElement: (id: string) => void;
  toggleElementLock: (id: string) => void;

  // Tables CRUD
  addTable: (table: Table) => void;
  updateTable: (id: string, patch: Partial<Table>) => void;
  removeTable: (id: string) => void;
  toggleTableLock: (id: string) => void;
  clearTables: () => void;

  // 自动布局
  runAutoLayout: (headcount: number, meetingType: MeetingType) => void;
}

const EMPTY_VENUE: Venue = {
  id: 'venue-default',
  name: '默认会议室',
  width: 10,
  height: 8,
  scale: 50,
  elements: [],
  tables: [],
};

export const useVenueStore = create<VenueState>()(
  immer((set) => ({
    venue: EMPTY_VENUE,

    loadTemplate: (key) =>
      set((s) => {
        s.venue = createVenueFromTemplate(key);
      }),

    resizeVenue: (width, height) =>
      set((s) => {
        s.venue.width = width;
        s.venue.height = height;
      }),

    addElement: (el) =>
      set((s) => {
        s.venue.elements.push(el);
      }),

    updateElement: (id, patch) =>
      set((s) => {
        const idx = s.venue.elements.findIndex((e) => e.id === id);
        if (idx >= 0) Object.assign(s.venue.elements[idx], patch);
      }),

    removeElement: (id) =>
      set((s) => {
        s.venue.elements = s.venue.elements.filter((e) => e.id !== id);
      }),

    toggleElementLock: (id) =>
      set((s) => {
        const el = s.venue.elements.find((e) => e.id === id);
        if (el) el.locked = !el.locked;
      }),

    addTable: (table) =>
      set((s) => {
        s.venue.tables.push(table);
      }),

    updateTable: (id, patch) =>
      set((s) => {
        const idx = s.venue.tables.findIndex((t) => t.id === id);
        if (idx >= 0) Object.assign(s.venue.tables[idx], patch);
      }),

    removeTable: (id) =>
      set((s) => {
        s.venue.tables = s.venue.tables.filter((t) => t.id !== id);
      }),

    toggleTableLock: (id) =>
      set((s) => {
        const t = s.venue.tables.find((tt) => tt.id === id);
        if (t) t.locked = !t.locked;
      }),

    clearTables: () =>
      set((s) => {
        s.venue.tables = [];
      }),

    runAutoLayout: (headcount, meetingType) =>
      set((s) => {
        s.venue.tables = autoLayout(s.venue, headcount, meetingType);
      }),
  })),
);

/** 测试重置 */
export function resetVenueStore(): void {
  useVenueStore.setState({ venue: { ...EMPTY_VENUE, elements: [], tables: [] } });
}
