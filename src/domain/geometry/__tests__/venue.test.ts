// M1-3: 场地边界与越界约束测试
import { describe, it, expect } from 'vitest';
import { isInsideVenue, constrainToVenue, VENUE_MARGIN } from '../venue';

const venue = { width: 15, height: 10 };

describe('isInsideVenue', () => {
  it('point well inside is true', () => {
    expect(isInsideVenue(5, 5, venue)).toBe(true);
  });

  it('point outside is false', () => {
    expect(isInsideVenue(-1, 5, venue)).toBe(false);
    expect(isInsideVenue(20, 5, venue)).toBe(false);
  });

  it('point exactly on margin edge is true', () => {
    expect(isInsideVenue(VENUE_MARGIN, VENUE_MARGIN, venue)).toBe(true);
    expect(isInsideVenue(15 - VENUE_MARGIN, 10 - VENUE_MARGIN, venue)).toBe(true);
  });
});

describe('constrainToVenue', () => {
  it('keeps in-bounds element unchanged', () => {
    const p = constrainToVenue(5, 5, 2, 1, venue);
    expect(p).toEqual({ x: 5, y: 5 });
  });

  it('clamps negative to margin', () => {
    const p = constrainToVenue(-3, -3, 2, 1, venue);
    expect(p.x).toBe(VENUE_MARGIN);
    expect(p.y).toBe(VENUE_MARGIN);
  });

  it('clamps positive overflow to right/bottom edge', () => {
    const p = constrainToVenue(20, 20, 2, 1, venue);
    expect(p.x).toBe(15 - 2 - VENUE_MARGIN);
    expect(p.y).toBe(10 - 1 - VENUE_MARGIN);
  });
});
