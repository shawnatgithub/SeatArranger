// M3-5 & M3-6: 贪心分配引擎测试
import { describe, it, expect } from 'vitest';
import { assignSeats, ENGINE_PERF_BUDGET_MS } from '../engine';
import type { Constraint, Guest, SeatSlot, Table } from '@/types';

function slot(id: string, localX: number, localY: number): SeatSlot {
  return { id, localX, localY, angle: 0, isFreeFloating: false };
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

/** 4 桌 × 6 座 = 24 座 */
function scenario20(): { tables: Table[]; guests: Guest[] } {
  const tables: Table[] = [];
  for (let t = 0; t < 4; t++) {
    const slots: SeatSlot[] = [];
    for (let s = 0; s < 6; s++) {
      slots.push(slot(`t${t}-s${s}`, (s - 2.5) * 0.6, -0.5));
    }
    tables.push(makeTable(`t${t}`, 3 + t * 3, 5, slots));
  }
  const guests: Guest[] = Array.from({ length: 20 }, (_, i) => makeGuest(`g${i}`));
  return { tables, guests };
}

describe('assignSeats (greedy + backtracking)', () => {
  it('assigns everyone when there are enough seats', () => {
    const { tables, guests } = scenario20();
    const result = assignSeats(tables, guests, []);
    expect(result.unassigned.length).toBe(0);
    // 每人分配到一个 seatSlotId
    const assigned = result.guests.filter((g) => g.seatSlotId);
    expect(assigned.length).toBe(20);
  });

  it('satisfies 4 hard adjacent constraints (100%)', () => {
    const { tables, guests } = scenario20();
    const constraints: Constraint[] = [
      { id: 'c1', type: 'hard', weight: 20, rule: { kind: 'adjacent', guestIds: ['g0', 'g1'] } },
      { id: 'c2', type: 'hard', weight: 20, rule: { kind: 'adjacent', guestIds: ['g2', 'g3'] } },
      { id: 'c3', type: 'hard', weight: 40, rule: { kind: 'isolate', guestIds: ['g4', 'g5'] } },
      { id: 'c4', type: 'hard', weight: 10, rule: { kind: 'same-table', guestIds: ['g6', 'g7'] } },
    ];
    const result = assignSeats(tables, guests, constraints);
    // 硬约束应全部满足
    const hardViolations = result.score.violations.filter((v) => {
      const c = constraints.find((cc) => cc.id === v.constraintId);
      return c?.type === 'hard';
    });
    expect(hardViolations.length).toBe(0);
  });

  it('reports unassigned when seats are insufficient', () => {
    // 只造 2 座，却有 5 位 guest
    const table = makeTable('tiny', 5, 5, [slot('s1', 0, 0), slot('s2', 0.6, 0)]);
    const guests: Guest[] = Array.from({ length: 5 }, (_, i) => makeGuest(`g${i}`));
    const result = assignSeats([table], guests, []);
    expect(result.unassigned.length).toBe(3);
  });

  it('respects seatPinned guests (do not move)', () => {
    const { tables, guests } = scenario20();
    // 把 g0 钉在 t0-s3
    guests[0].seatPinned = true;
    guests[0].tableId = 't0';
    guests[0].seatSlotId = 't0-s3';
    const result = assignSeats(tables, guests, []);
    const g0 = result.guests.find((g) => g.id === 'g0')!;
    expect(g0.seatSlotId).toBe('t0-s3');
  });

  it('finishes 100 guests × 50 seats scenario within 3 seconds', () => {
    // M3-6 性能测试：100 人尝试放到 50 座
    const tables: Table[] = [];
    for (let t = 0; t < 10; t++) {
      const slots: SeatSlot[] = [];
      for (let s = 0; s < 5; s++) {
        slots.push(slot(`t${t}-s${s}`, s * 0.6 - 1.2, -0.5));
      }
      tables.push(makeTable(`t${t}`, 3 + (t % 5) * 3, 3 + Math.floor(t / 5) * 3, slots));
    }
    const guests: Guest[] = Array.from({ length: 100 }, (_, i) => makeGuest(`g${i}`, i < 5 ? ['vip'] : []));
    const constraints: Constraint[] = [
      { id: 'c1', type: 'soft', weight: 20, rule: { kind: 'adjacent', guestIds: ['g0', 'g1'] } },
      { id: 'c2', type: 'soft', weight: 10, rule: { kind: 'same-table', guestIds: ['g2', 'g3'] } },
    ];
    const start = performance.now();
    const result = assignSeats(tables, guests, constraints);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThanOrEqual(ENGINE_PERF_BUDGET_MS);
    // 50 座位分完
    expect(result.guests.filter((g) => g.seatSlotId).length).toBe(50);
    expect(result.unassigned.length).toBe(50);
  });
});
