// M2-1..M2-4: 桌椅点位算法测试 — 参考 PRD §4.3.1
import { describe, it, expect } from 'vitest';
import { calculateSeatSlots, CHAIR_SIZE, CHAIR_GAP } from '../seatSlots';

describe('conference-long / training-desk', () => {
  it('3m×1m + 8 chairs distributes along 4 sides', () => {
    const slots = calculateSeatSlots(3, 1, 'conference-long', 8);
    // 长边可用 2.5m / (0.5+0.1) = 4 每边最多 4，短边可用 0.5m / 0.6 = 0
    // 8 椅 → 长边 4+4 = 8，短边 0
    expect(slots.length).toBe(8);
    const top = slots.filter((s) => s.angle === 0);
    const bottom = slots.filter((s) => s.angle === 180);
    expect(top.length).toBe(4);
    expect(bottom.length).toBe(4);
  });

  it('clamps to maxCapacity when chairCount exceeds', () => {
    // 极小桌子容不下 20 把椅子
    const slots = calculateSeatSlots(1, 0.5, 'conference-long', 20);
    expect(slots.length).toBeLessThan(20);
  });

  it('CHAIR_SIZE and CHAIR_GAP constants match PRD', () => {
    expect(CHAIR_SIZE).toBe(0.5);
    expect(CHAIR_GAP).toBe(0.1);
  });
});

describe('round table', () => {
  it('distributes evenly along circumference', () => {
    // 直径 1.6m 圆桌
    const slots = calculateSeatSlots(1.6, 1.6, 'round', 8);
    expect(slots.length).toBe(8);
    // 每个点位到桌心的距离应相等
    const distances = slots.map((s) => Math.hypot(s.localX, s.localY));
    for (const d of distances) {
      expect(d).toBeCloseTo(distances[0], 6);
    }
  });

  it('caps at capacity for small round table', () => {
    // 直径 0.5m 圆桌 → 周长 ≈ 1.57，容量 = floor(1.57 / 0.6) = 2
    const slots = calculateSeatSlots(0.5, 0.5, 'round', 8);
    expect(slots.length).toBeLessThanOrEqual(2);
  });
});

describe('u-shape table', () => {
  it('6m×4m + 14 chairs distributed across bottom/left/right', () => {
    const slots = calculateSeatSlots(6, 4, 'u-shape', 14);
    expect(slots.length).toBeGreaterThanOrEqual(10);
    expect(slots.length).toBeLessThanOrEqual(14);
    // 底部朝上 (angle=0)、左翼朝右 (angle=90)、右翼朝左 (angle=270)
    const angles = new Set(slots.map((s) => s.angle));
    expect(angles.has(0)).toBe(true);
    expect(angles.has(90)).toBe(true);
    expect(angles.has(270)).toBe(true);
  });
});

describe('head table (主席台)', () => {
  it('5m stage + 6 chairs on single side facing audience (angle=180)', () => {
    const slots = calculateSeatSlots(5, 1, 'head', 6);
    expect(slots.length).toBe(6);
    for (const s of slots) {
      expect(s.angle).toBe(180);
      // 全部在下方（y > 0）
      expect(s.localY).toBeGreaterThan(0);
    }
  });
});
