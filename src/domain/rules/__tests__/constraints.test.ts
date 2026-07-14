// M3-3: constraints DSL 构建器测试
import { describe, it, expect } from 'vitest';
import { buildConstraints } from '../constraints';
import type { Guest, GuestRelation } from '@/types';

function makeGuest(id: string, tags: Guest['tags'] = []): Guest {
  return {
    id,
    name: id,
    tags,
    seatPinned: false,
    satisfaction: 'high',
  };
}

describe('buildConstraints', () => {
  it('maps must-adjacent relation to adjacent hard constraint', () => {
    const guests = [makeGuest('a'), makeGuest('b')];
    const relations: GuestRelation[] = [
      { id: 'r1', guestAId: 'a', guestBId: 'b', type: 'must-adjacent', constraintLevel: 'hard' },
    ];
    const cs = buildConstraints(relations, guests);
    const adj = cs.find((c) => c.rule.kind === 'adjacent');
    expect(adj).toBeDefined();
    expect(adj!.type).toBe('hard');
    expect(new Set(adj!.rule.guestIds)).toEqual(new Set(['a', 'b']));
    expect(adj!.weight).toBeGreaterThan(0);
  });

  it('maps must-isolate relation to isolate hard constraint', () => {
    const guests = [makeGuest('a'), makeGuest('b')];
    const relations: GuestRelation[] = [
      { id: 'r1', guestAId: 'a', guestBId: 'b', type: 'must-isolate', constraintLevel: 'hard' },
    ];
    const cs = buildConstraints(relations, guests);
    const iso = cs.find((c) => c.rule.kind === 'isolate');
    expect(iso).toBeDefined();
    expect(iso!.type).toBe('hard');
  });

  it('maps prefer-same-table relation to same-table soft constraint', () => {
    const guests = [makeGuest('a'), makeGuest('b')];
    const relations: GuestRelation[] = [
      { id: 'r1', guestAId: 'a', guestBId: 'b', type: 'prefer-same-table', constraintLevel: 'soft' },
    ];
    const cs = buildConstraints(relations, guests);
    const st = cs.find((c) => c.rule.kind === 'same-table');
    expect(st).toBeDefined();
    expect(st!.type).toBe('soft');
  });

  it('generates priority-front for vip-tagged guest', () => {
    const guests = [makeGuest('vip-1', ['vip']), makeGuest('normal-1')];
    const cs = buildConstraints([], guests);
    const pf = cs.filter((c) => c.rule.kind === 'priority-front');
    expect(pf.length).toBe(1);
    expect(pf[0].rule.guestIds).toEqual(['vip-1']);
    // VIP 权重高
    expect(pf[0].weight).toBeGreaterThanOrEqual(3);
  });

  it('generates priority-center for host/speaker-tagged guest', () => {
    const guests = [makeGuest('h-1', ['host']), makeGuest('s-1', ['speaker'])];
    const cs = buildConstraints([], guests);
    const pc = cs.filter((c) => c.rule.kind === 'priority-center');
    expect(pc.length).toBe(2);
    expect(new Set(pc.flatMap((c) => c.rule.guestIds))).toEqual(new Set(['h-1', 's-1']));
  });

  it('produces stable unique ids', () => {
    const guests = [makeGuest('a'), makeGuest('b', ['vip'])];
    const relations: GuestRelation[] = [
      { id: 'r1', guestAId: 'a', guestBId: 'b', type: 'must-adjacent', constraintLevel: 'hard' },
    ];
    const cs = buildConstraints(relations, guests);
    const ids = cs.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('skips relations referencing unknown guests', () => {
    const guests = [makeGuest('a')];
    const relations: GuestRelation[] = [
      { id: 'r1', guestAId: 'a', guestBId: 'ghost', type: 'must-adjacent', constraintLevel: 'hard' },
    ];
    const cs = buildConstraints(relations, guests);
    expect(cs.filter((c) => c.rule.kind === 'adjacent').length).toBe(0);
  });
});
