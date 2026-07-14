// M7-4 & M7-5: 桌椅交互辅助纯函数（供 store/组件与测试共享）
import type { Table, SeatSlot } from '@/types';
import { resolveCollision, type CollidableRect } from '@/domain/geometry';
import { slotToGlobal } from '@/domain/geometry';

/** 把桌子（中心坐标）转换为碰撞矩形（左上角坐标 + 尺寸） */
function tableToRect(t: Table): CollidableRect {
  return {
    id: t.id,
    x: t.x - t.width / 2,
    y: t.y - t.height / 2,
    width: t.width,
    height: t.height,
    rotation: t.rotation,
    locked: t.locked,
  };
}

/**
 * 桌子拖拽后的落位：与其他桌子发生碰撞时，用 resolveCollision 推离；
 * 若当前桌子 locked，则不动。返回中心坐标（米）。
 */
export function resolveTableDragEnd(
  moved: Table,
  others: readonly Table[],
): { x: number; y: number } {
  const rect = tableToRect(moved);
  const otherRects = others.filter((t) => t.id !== moved.id).map(tableToRect);
  const pos = resolveCollision(rect, otherRects);
  return {
    x: pos.x + moved.width / 2,
    y: pos.y + moved.height / 2,
  };
}

/**
 * 检测新位置是否与其他桌子碰撞（用于拖拽实时高亮）。
 */
export function hasTableCollision(
  moved: Table,
  others: readonly Table[],
): boolean {
  const rect = tableToRect(moved);
  const otherRects = others.filter((t) => t.id !== moved.id).map(tableToRect);
  const collided = resolveCollision(rect, otherRects);
  // 若 resolve 后位置发生变化则表示原本重叠
  return Math.abs(collided.x - rect.x) > 1e-6 || Math.abs(collided.y - rect.y) > 1e-6;
}

/**
 * 双击椅子：绑定态 → 解绑到当前全局坐标；解绑态 → 回到最近空点位（简单起见回到 slot 原点位）。
 */
export function toggleSeatFreeFloating(slot: SeatSlot, table: Table): SeatSlot {
  if (slot.isFreeFloating) {
    // 回到绑定态：清除 free 字段
    return {
      ...slot,
      isFreeFloating: false,
      freeX: undefined,
      freeY: undefined,
      freeAngle: undefined,
    };
  }
  const g = slotToGlobal(slot, table);
  return {
    ...slot,
    isFreeFloating: true,
    freeX: g.x,
    freeY: g.y,
    freeAngle: g.angle,
  };
}
