// M3-1 & M3-2: 自动布局测试
import { describe, it, expect } from 'vitest';
import { autoLayout } from '../autoLayout';
import { checkCollision } from '@/domain/geometry';
import type { Venue, MeetingType } from '@/types';

function makeVenue(width: number, height: number, extraElements: Venue['elements'] = []): Venue {
  return {
    id: 'v',
    name: '会议室',
    width,
    height,
    scale: 50,
    elements: extraElements,
    tables: [],
  };
}

describe('autoLayout', () => {
  it('training layout for 40 people in 15×10 room produces valid tables', () => {
    const venue = makeVenue(15, 10);
    const tables = autoLayout(venue, 40, 'training');
    expect(tables.length).toBeGreaterThan(4);
    expect(tables.length).toBeLessThanOrEqual(12);

    // 全部桌子应在房间内 (0.5m 距墙)
    for (const t of tables) {
      expect(t.x - t.width / 2).toBeGreaterThanOrEqual(0.3);
      expect(t.x + t.width / 2).toBeLessThanOrEqual(venue.width - 0.3);
      expect(t.y - t.height / 2).toBeGreaterThanOrEqual(0.3);
      expect(t.y + t.height / 2).toBeLessThanOrEqual(venue.height - 0.3);
    }

    // 桌子之间不重叠（作为矩形）
    for (let i = 0; i < tables.length; i++) {
      for (let j = i + 1; j < tables.length; j++) {
        const a = tables[i];
        const b = tables[j];
        const overlap = checkCollision(
          { x: a.x - a.width / 2, y: a.y - a.height / 2, width: a.width, height: a.height, rotation: 0 },
          { x: b.x - b.width / 2, y: b.y - b.height / 2, width: b.width, height: b.height, rotation: 0 },
        );
        expect(overlap).toBe(false);
      }
    }
  });

  it.each<MeetingType>(['report', 'training', 'negotiation', 'round-table'])(
    'generates tables for meeting type %s',
    (type) => {
      const venue = makeVenue(15, 10);
      const tables = autoLayout(venue, 20, type);
      expect(tables.length).toBeGreaterThan(0);
    },
  );

  it('respects locked elements: locked stage stays as centerline', () => {
    // 前墙居中放置锁定屏幕
    const stageEl = {
      id: 'screen-1',
      type: 'screen' as const,
      x: 6.25, // (15-2.5)/2
      y: 0,
      width: 2.5,
      height: 0.05,
      rotation: 0,
      locked: true,
    };
    const venue = makeVenue(15, 10, [stageEl]);
    const tables = autoLayout(venue, 20, 'report');
    // report 类型应有主席台，主席台应大致居中于屏幕（x ≈ 7.5）
    const head = tables.find((t) => t.type === 'head');
    expect(head).toBeDefined();
    if (head) {
      expect(Math.abs(head.x - 7.5)).toBeLessThan(1.0);
    }
  });

  it('locked existing tables are preserved (skipped in re-layout)', () => {
    const venue = makeVenue(15, 10);
    venue.tables = [
      {
        id: 'fixed',
        type: 'conference-long',
        x: 3,
        y: 3,
        width: 2,
        height: 1,
        rotation: 0,
        tableNumber: '固定桌',
        capacity: 6,
        seatSlots: [],
        locked: true,
      },
    ];
    const tables = autoLayout(venue, 20, 'training');
    const preserved = tables.find((t) => t.id === 'fixed');
    expect(preserved).toBeDefined();
    expect(preserved!.x).toBe(3);
    expect(preserved!.y).toBe(3);
  });
});
