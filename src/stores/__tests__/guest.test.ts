// M4-2: Guest Store 测试
import { describe, it, expect, beforeEach } from 'vitest';
import { useGuestStore, resetGuestStore } from '../guest';
import { useVenueStore, resetVenueStore } from '../venue';
import type { Guest, GuestRelation } from '@/types';

const g = (id: string, tags: Guest['tags'] = []): Guest => ({
  id,
  name: id,
  tags,
  seatPinned: false,
  satisfaction: 'high',
});

const rel = (
  id: string,
  a: string,
  b: string,
  type: GuestRelation['type'] = 'must-adjacent',
): GuestRelation => ({ id, guestAId: a, guestBId: b, type, constraintLevel: 'hard' });

describe('useGuestStore', () => {
  beforeEach(() => {
    resetGuestStore();
    resetVenueStore();
  });

  it('setGuests updates list length', () => {
    useGuestStore.getState().setGuests([g('a'), g('b'), g('c')]);
    expect(useGuestStore.getState().guests.length).toBe(3);
  });

  it('addRelation dedupes duplicates', () => {
    useGuestStore.getState().addRelation(rel('r1', 'a', 'b'));
    useGuestStore.getState().addRelation(rel('r2', 'b', 'a')); // 反向同类
    expect(useGuestStore.getState().relations.length).toBe(1);
  });

  it('removeGuest cascades relation cleanup', () => {
    useGuestStore.getState().setGuests([g('a'), g('b')]);
    useGuestStore.getState().addRelation(rel('r1', 'a', 'b'));
    useGuestStore.getState().removeGuest('a');
    expect(useGuestStore.getState().relations.length).toBe(0);
  });

  it('autoAssignSeats writes back seatSlotId to guests', () => {
    // 准备 venue 带 1 张 2 座桌子
    useVenueStore.getState().loadTemplate('medium');
    useVenueStore.getState().addTable({
      id: 't1',
      type: 'conference-long',
      x: 5,
      y: 5,
      width: 2,
      height: 1,
      rotation: 0,
      tableNumber: 'T1',
      capacity: 2,
      seatSlots: [
        { id: 's1', localX: -0.3, localY: -0.5, angle: 0, isFreeFloating: false },
        { id: 's2', localX: 0.3, localY: -0.5, angle: 0, isFreeFloating: false },
      ],
      locked: false,
    });
    useGuestStore.getState().setGuests([g('a'), g('b')]);
    const res = useGuestStore.getState().autoAssignSeats();
    expect(res.assigned).toBe(2);
    const guests = useGuestStore.getState().guests;
    expect(guests.every((gg) => !!gg.seatSlotId)).toBe(true);
  });
});
