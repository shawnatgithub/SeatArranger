// M4-2: Guest Store — 参会者 + 关系 CRUD + 一键自动排座
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Guest, GuestRelation, RuleScene, Table } from '@/types';
import { buildConstraints } from '@/domain/rules/constraints';
import { assignSeats } from '@/domain/rules/engine';
import { evaluateGuestSatisfaction } from '@/domain/scoring/score';
import { useVenueStore } from './venue';

interface GuestState {
  guests: Guest[];
  relations: GuestRelation[];
  ruleScene: RuleScene;
  unassignedIds: string[];

  setGuests: (list: Guest[]) => void;
  addGuest: (g: Guest) => void;
  updateGuest: (id: string, patch: Partial<Guest>) => void;
  removeGuest: (id: string) => void;

  addRelation: (r: GuestRelation) => void;
  removeRelation: (id: string) => void;
  setRuleScene: (scene: RuleScene) => void;

  /** 触发排座：读取 venue store 的 tables，返回是否成功 */
  autoAssignSeats: () => { assigned: number; unassigned: number };
  clearAssignments: () => void;
}

export const useGuestStore = create<GuestState>()(
  immer((set, get) => ({
    guests: [],
    relations: [],
    ruleScene: 'corporate',
    unassignedIds: [],

    setGuests: (list) =>
      set((s) => {
        s.guests = list;
      }),

    addGuest: (g) =>
      set((s) => {
        if (!s.guests.some((x) => x.id === g.id)) s.guests.push(g);
      }),

    updateGuest: (id, patch) =>
      set((s) => {
        const idx = s.guests.findIndex((g) => g.id === id);
        if (idx >= 0) Object.assign(s.guests[idx], patch);
      }),

    removeGuest: (id) =>
      set((s) => {
        s.guests = s.guests.filter((g) => g.id !== id);
        s.relations = s.relations.filter((r) => r.guestAId !== id && r.guestBId !== id);
      }),

    addRelation: (r) =>
      set((s) => {
        // 去重：同一对 guests + 同类型算重复
        const dup = s.relations.some(
          (x) =>
            x.type === r.type &&
            ((x.guestAId === r.guestAId && x.guestBId === r.guestBId) ||
              (x.guestAId === r.guestBId && x.guestBId === r.guestAId)),
        );
        if (!dup) s.relations.push(r);
      }),

    removeRelation: (id) =>
      set((s) => {
        s.relations = s.relations.filter((r) => r.id !== id);
      }),

    setRuleScene: (scene) =>
      set((s) => {
        s.ruleScene = scene;
      }),

    autoAssignSeats: () => {
      const { guests, relations } = get();
      const tables: Table[] = useVenueStore.getState().venue.tables;
      const constraints = buildConstraints(relations, guests);
      const result = assignSeats(tables, guests, constraints);

      // 回写 venue.tables（座位 occupantId 变更）
      useVenueStore.setState((s) => {
        s.venue.tables = result.tables;
      });

      // 更新 guests（tableId/seatSlotId/satisfaction）
      const perGuest = result.score.perGuest;
      const updated = result.guests.map((g) => ({
        ...g,
        satisfaction: evaluateGuestSatisfaction(g, perGuest[g.id] ?? 0),
      }));
      set((s) => {
        s.guests = updated;
        s.unassignedIds = result.unassigned.map((u) => u.id);
      });
      return { assigned: updated.filter((g) => g.seatSlotId).length, unassigned: result.unassigned.length };
    },

    clearAssignments: () =>
      set((s) => {
        s.guests = s.guests.map((g) => ({ ...g, tableId: undefined, seatSlotId: undefined }));
        s.unassignedIds = [];
      }),
  })),
);

export function resetGuestStore(): void {
  useGuestStore.setState({ guests: [], relations: [], ruleScene: 'corporate', unassignedIds: [] });
}
