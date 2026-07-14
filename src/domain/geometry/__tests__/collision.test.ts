// M1-4 & M1-5: 碰撞检测与解析测试
import { describe, it, expect } from 'vitest';
import { checkCollision, resolveCollision } from '../collision';
import type { Rect } from '@/types';

function rect(x: number, y: number, w: number, h: number, r = 0): Rect {
  return { x, y, width: w, height: h, rotation: r };
}

describe('checkCollision (AABB when rotation=0, OBB otherwise)', () => {
  it('overlapping axis-aligned rects', () => {
    expect(checkCollision(rect(0, 0, 2, 2), rect(1, 1, 2, 2))).toBe(true);
  });

  it('non-overlapping axis-aligned rects', () => {
    expect(checkCollision(rect(0, 0, 2, 2), rect(3, 3, 2, 2))).toBe(false);
  });

  it('rotated 45° rects touching corner', () => {
    // 两个 1x1 方块，中心距 1.5，通过 45° 旋转其对角线约 1.414 > 1.5 → 不重叠
    expect(checkCollision(rect(0, 0, 1, 1, 45), rect(1.5, 0, 1, 1, 45))).toBe(false);
    // 中心距 1.2 → 重叠
    expect(checkCollision(rect(0, 0, 1, 1, 45), rect(1.2, 0, 1, 1, 45))).toBe(true);
  });
});

describe('resolveCollision (respects locked)', () => {
  it('locked opponent stays; current pushed away', () => {
    const moved = { ...rect(1, 0, 2, 2), locked: false };
    const other = { ...rect(0, 0, 2, 2), locked: true };
    const p = resolveCollision(moved, [other]);
    // 应把 moved 沿 X 推离到 other 右侧
    expect(p.x).toBeGreaterThanOrEqual(2);
  });

  it('current is locked → not moved', () => {
    const moved = { ...rect(1, 0, 2, 2), locked: true };
    const other = { ...rect(0, 0, 2, 2), locked: false };
    const p = resolveCollision(moved, [other]);
    expect(p).toEqual({ x: 1, y: 0 });
  });

  it('both free → current is pushed', () => {
    const moved = { ...rect(1, 0, 2, 2), locked: false };
    const other = { ...rect(0, 0, 2, 2), locked: false };
    const p = resolveCollision(moved, [other]);
    expect(p.x).not.toBe(1);
  });

  it('no collision → position unchanged', () => {
    const moved = { ...rect(5, 5, 2, 2), locked: false };
    const other = { ...rect(0, 0, 2, 2), locked: false };
    const p = resolveCollision(moved, [other]);
    expect(p).toEqual({ x: 5, y: 5 });
  });
});
