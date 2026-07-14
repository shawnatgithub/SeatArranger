// M1-6 & M1-7: 网格吸附 + 智能对齐线测试
import { describe, it, expect } from 'vitest';
import {
  snapToGrid,
  GRID_SIZE_METERS,
  SNAP_THRESHOLD,
  getSnapLines,
  findNearestSnapLine,
} from '../snap';

describe('snapToGrid (soft snap)', () => {
  it('snaps when within threshold', () => {
    // 3.55 → 距 3.5 为 0.05 < 0.15 → snap
    expect(snapToGrid(3.55)).toBe(3.5);
  });

  it('keeps value when beyond threshold', () => {
    // 3.7 → 距 3.5 为 0.2 > 0.15 → 保持
    expect(snapToGrid(3.7)).toBe(3.7);
  });

  it('clamps negative to 0', () => {
    expect(snapToGrid(-0.1)).toBe(0);
  });

  it('uses default grid size 0.5', () => {
    expect(GRID_SIZE_METERS).toBe(0.5);
    expect(SNAP_THRESHOLD).toBe(0.15);
  });
});

describe('getSnapLines / findNearestSnapLine', () => {
  const els = [
    { id: 'A', x: 1, y: 2, width: 2, height: 1 },
    { id: 'B', x: 5, y: 6, width: 2, height: 2 },
  ];

  it('produces 6 lines per element (excluding excludeId)', () => {
    const lines = getSnapLines(els, 'B');
    // 只留 A 的 6 条线（left/right/hcenter vertical + top/bottom/vcenter horizontal）
    expect(lines.filter((l) => l.orientation === 'vertical')).toHaveLength(3);
    expect(lines.filter((l) => l.orientation === 'horizontal')).toHaveLength(3);
  });

  it('findNearestSnapLine returns nearest within threshold', () => {
    const lines = getSnapLines(els, 'B');
    // A 的中心 vertical 线 x=2，查询 2.1（差 0.1 < 0.2）
    const near = findNearestSnapLine(2.1, lines, 'vertical', 0.2);
    expect(near).toBe(2);
  });

  it('returns null when beyond threshold', () => {
    const lines = getSnapLines(els, 'B');
    const near = findNearestSnapLine(2.5, lines, 'vertical', 0.2);
    expect(near).toBeNull();
  });
});
