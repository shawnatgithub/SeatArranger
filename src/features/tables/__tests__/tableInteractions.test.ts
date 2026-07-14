// M7-4 & M7-5: 桌椅交互纯函数测试
import { describe, expect, it } from 'vitest';
import type { SeatSlot, Table } from '@/types';
import {
  hasTableCollision,
  resolveTableDragEnd,
  toggleSeatFreeFloating,
} from '../tableInteractions';

const t = (o: Partial<Table>): Table => ({
  id: 'x',
  type: 'conference-long',
  x: 0,
  y: 0,
  width: 2,
  height: 1,
  rotation: 0,
  tableNumber: '',
  capacity: 8,
  seatSlots: [],
  locked: false,
  ...o,
});

describe('resolveTableDragEnd', () => {
  it('拖入锁定桌子 → 推开后不再碰撞', () => {
    const lockedA = t({ id: 'a', x: 5, y: 5, locked: true });
    const moving = t({ id: 'b', x: 5.5, y: 5, locked: false });
    const result = resolveTableDragEnd(moving, [lockedA]);
    // 推开后原 moving 已迁移；再次检查碰撞应为 false
    const movedAfter = t({ id: 'b', x: result.x, y: result.y });
    expect(hasTableCollision(movedAfter, [lockedA])).toBe(false);
  });

  it('无碰撞时保持原位', () => {
    const other = t({ id: 'a', x: 1, y: 1 });
    const moving = t({ id: 'b', x: 5, y: 5 });
    const result = resolveTableDragEnd(moving, [other]);
    expect(result.x).toBeCloseTo(5);
    expect(result.y).toBeCloseTo(5);
  });

  it('当前桌子 locked 时不动', () => {
    const other = t({ id: 'a', x: 5, y: 5 });
    const moving = t({ id: 'b', x: 5.2, y: 5, locked: true });
    const result = resolveTableDragEnd(moving, [other]);
    expect(result.x).toBeCloseTo(5.2);
  });
});

describe('hasTableCollision', () => {
  it('重叠时返回 true', () => {
    const other = t({ id: 'a', x: 5, y: 5 });
    const moving = t({ id: 'b', x: 5.5, y: 5 });
    expect(hasTableCollision(moving, [other])).toBe(true);
  });
  it('不重叠时返回 false', () => {
    const other = t({ id: 'a', x: 1, y: 1 });
    const moving = t({ id: 'b', x: 5, y: 5 });
    expect(hasTableCollision(moving, [other])).toBe(false);
  });
});

describe('toggleSeatFreeFloating', () => {
  const table = t({ id: 'T', x: 5, y: 3 });
  const bound: SeatSlot = { id: 's', localX: 1, localY: 0, angle: 0, isFreeFloating: false };

  it('绑定→解绑：设置 freeX/Y 为全局坐标', () => {
    const out = toggleSeatFreeFloating(bound, table);
    expect(out.isFreeFloating).toBe(true);
    expect(out.freeX).toBeCloseTo(6);
    expect(out.freeY).toBeCloseTo(3);
  });

  it('解绑→绑定：清除 freeX/Y', () => {
    const free: SeatSlot = {
      ...bound,
      isFreeFloating: true,
      freeX: 6,
      freeY: 3,
      freeAngle: 0,
    };
    const out = toggleSeatFreeFloating(free, table);
    expect(out.isFreeFloating).toBe(false);
    expect(out.freeX).toBeUndefined();
    expect(out.freeY).toBeUndefined();
  });
});
