// M3-4: 座位方案评分函数测试
import { describe, it, expect } from 'vitest';
import { scoreAssignment, evaluateGuestSatisfaction } from '../score';
import type { Constraint, Guest, Table, SeatSlot } from '@/types';

function slot(id: string, localX: number, localY: number, occupantId?: string): SeatSlot {
  return { id, localX, localY, angle: 0, occupantId, isFreeFloating: false };
}

function makeTable(id: string, x: number, y: number, slots: SeatSlot[]): Table {
  return {
    id,
    type: 'conference-long',
    x,
    y,
    width: 3,
    height: 1,
    rotation: 0,
    tableNumber: id,
    capacity: slots.length,
    seatSlots: slots,
    locked: false,
  };
}

function makeGuest(id: string, tags: Guest['tags'] = []): Guest {
  return { id, name: id, tags, seatPinned: false, satisfaction: 'high' };
}

describe('scoreAssignment', () => {
  it('adjacent constraint satisfied → +20', () => {
    const table = makeTable('t1', 5, 5, [
      slot('s1', -0.6, -0.5, 'a'),
      slot('s2', 0, -0.5, 'b'),
      slot('s3', 0.6, -0.5),
    ]);
    const constraints: Constraint[] = [
      { id: 'c1', type: 'hard', weight: 20, rule: { kind: 'adjacent', guestIds: ['a', 'b'] } },
    ];
    const guests = [makeGuest('a'), makeGuest('b')];
    const result = scoreAssignment([table], guests, constraints);
    expect(result.total).toBeGreaterThanOrEqual(20);
    expect(result.violations.length).toBe(0);
  });

  it('isolate constraint violated (same table) → -40 and 1 violation', () => {
    const table = makeTable('t1', 5, 5, [
      slot('s1', -0.6, -0.5, 'a'),
      slot('s2', 0.6, -0.5, 'b'),
    ]);
    const constraints: Constraint[] = [
      { id: 'c1', type: 'hard', weight: 40, rule: { kind: 'isolate', guestIds: ['a', 'b'] } },
    ];
    const guests = [makeGuest('a'), makeGuest('b')];
    const result = scoreAssignment([table], guests, constraints);
    expect(result.total).toBeLessThanOrEqual(-40);
    expect(result.violations.length).toBe(1);
    expect(result.violations[0].rule.kind).toBe('isolate');
  });

  it('same-table satisfied on same table', () => {
    const table = makeTable('t1', 5, 5, [
      slot('s1', -0.6, -0.5, 'a'),
      slot('s2', 0.6, -0.5, 'b'),
    ]);
    const constraints: Constraint[] = [
      { id: 'c1', type: 'soft', weight: 10, rule: { kind: 'same-table', guestIds: ['a', 'b'] } },
    ];
    const guests = [makeGuest('a'), makeGuest('b')];
    const result = scoreAssignment([table], guests, constraints);
    expect(result.total).toBeGreaterThanOrEqual(10);
  });

  it('vip priority-front weighted ×3 — front guest scores higher', () => {
    // 前排：桌子 y 越小越靠前
    const front = makeTable('front', 5, 1, [slot('s1', 0, 0, 'vip1')]);
    const back = makeTable('back', 5, 10, [slot('s2', 0, 0, 'vip2')]);
    const constraints: Constraint[] = [
      { id: 'c1', type: 'soft', weight: 45, rule: { kind: 'priority-front', guestIds: ['vip1'] } },
      { id: 'c2', type: 'soft', weight: 15, rule: { kind: 'priority-front', guestIds: ['n1'] } },
    ];
    const guests = [makeGuest('vip1', ['vip']), makeGuest('vip2', ['vip'])];
    const result = scoreAssignment([front, back], guests, constraints);
    // vip1（前排，weight=45）应比普通（若在后排 weight=15）拿到更多
    expect(result.perGuest['vip1']).toBeGreaterThan(30);
  });

  it('20-person hand-computed scenario matches', () => {
    // 简化：2 桌 × 2 人。adjacent(a,b)满足=+20；isolate(c,d)违规=-40；同表(e,f)不适用
    const t1 = makeTable('t1', 5, 5, [
      slot('s1', -0.6, -0.5, 'a'),
      slot('s2', 0, -0.5, 'b'),
    ]);
    const t2 = makeTable('t2', 5, 8, [
      slot('s3', -0.6, -0.5, 'c'),
      slot('s4', 0.6, -0.5, 'd'),
    ]);
    const constraints: Constraint[] = [
      { id: 'c1', type: 'hard', weight: 20, rule: { kind: 'adjacent', guestIds: ['a', 'b'] } },
      { id: 'c2', type: 'hard', weight: 40, rule: { kind: 'isolate', guestIds: ['c', 'd'] } },
    ];
    const guests = ['a', 'b', 'c', 'd'].map((id) => makeGuest(id));
    const result = scoreAssignment([t1, t2], guests, constraints);
    expect(result.total).toBe(20 - 40);
    expect(result.violations.length).toBe(1);
  });

  it('evaluateGuestSatisfaction classifies high/medium/low', () => {
    const guest = makeGuest('a');
    expect(evaluateGuestSatisfaction(guest, 50)).toBe('high');
    expect(evaluateGuestSatisfaction(guest, 0)).toBe('medium');
    expect(evaluateGuestSatisfaction(guest, -50)).toBe('low');
  });
});
