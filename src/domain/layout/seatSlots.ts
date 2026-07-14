// M2: 桌椅动态点位算法 — 参考 PRD §4.3.1
import type { SeatSlot, TableType } from '@/types';

export const CHAIR_SIZE = 0.5; // 每把椅子占地 0.5m × 0.5m
export const CHAIR_GAP = 0.1; // 椅子最小间距

/**
 * 根据桌子尺寸、类型和椅子数量动态计算虚拟座位点位（本地坐标）。
 * chairCount 超过桌子最大容量时按容量截断。
 */
export function calculateSeatSlots(
  tableWidth: number,
  tableHeight: number,
  tableType: TableType,
  chairCount: number,
): SeatSlot[] {
  if (chairCount <= 0) return [];

  switch (tableType) {
    case 'conference-long':
    case 'training-desk':
      return rectSlots(tableWidth, tableHeight, chairCount);
    case 'round':
      return roundSlots(tableWidth, chairCount);
    case 'u-shape':
      return uShapeSlots(tableWidth, tableHeight, chairCount);
    case 'head':
      return headSlots(tableWidth, tableHeight, chairCount);
    default:
      return [];
  }
}

// ==================== 长桌 / 课桌：四边分布 ====================
function rectSlots(w: number, h: number, count: number): SeatSlot[] {
  const longAvail = Math.max(0, w - 0.5);
  const shortAvail = Math.max(0, h - 0.5);
  const maxLong = Math.floor(longAvail / (CHAIR_SIZE + CHAIR_GAP));
  const maxShort = Math.floor(shortAvail / (CHAIR_SIZE + CHAIR_GAP));
  const maxCapacity = maxLong * 2 + maxShort * 2;
  const actual = Math.min(count, maxCapacity);

  const longCount = Math.min(actual, maxLong * 2);
  const shortCount = Math.min(actual - longCount, maxShort * 2);

  const slots: SeatSlot[] = [];
  const topCount = Math.ceil(longCount / 2);
  const bottomCount = longCount - topCount;

  for (let i = 0; i < topCount; i++) {
    const t = topCount > 1 ? i / (topCount - 1) : 0.5;
    slots.push(makeSlot(`slot-${slots.length}`, -w / 2 + 0.25 + t * longAvail, -h / 2 - CHAIR_SIZE / 2, 0));
  }
  for (let i = 0; i < bottomCount; i++) {
    const t = bottomCount > 1 ? i / (bottomCount - 1) : 0.5;
    slots.push(makeSlot(`slot-${slots.length}`, -w / 2 + 0.25 + t * longAvail, h / 2 + CHAIR_SIZE / 2, 180));
  }

  const leftCount = Math.ceil(shortCount / 2);
  const rightCount = shortCount - leftCount;
  for (let i = 0; i < leftCount; i++) {
    const t = leftCount > 1 ? i / (leftCount - 1) : 0.5;
    slots.push(makeSlot(`slot-${slots.length}`, -w / 2 - CHAIR_SIZE / 2, -h / 2 + 0.25 + t * shortAvail, 90));
  }
  for (let i = 0; i < rightCount; i++) {
    const t = rightCount > 1 ? i / (rightCount - 1) : 0.5;
    slots.push(makeSlot(`slot-${slots.length}`, w / 2 + CHAIR_SIZE / 2, -h / 2 + 0.25 + t * shortAvail, 270));
  }
  return slots;
}

// ==================== 圆桌 ====================
function roundSlots(diameter: number, count: number): SeatSlot[] {
  const radius = diameter / 2 + CHAIR_SIZE / 2;
  const circumference = Math.PI * diameter;
  const maxCapacity = Math.max(1, Math.floor(circumference / (CHAIR_SIZE + CHAIR_GAP)));
  const actual = Math.min(count, maxCapacity);
  const slots: SeatSlot[] = [];
  for (let i = 0; i < actual; i++) {
    const angleRad = (i / actual) * Math.PI * 2;
    slots.push(
      makeSlot(
        `slot-${i}`,
        Math.cos(angleRad) * radius,
        Math.sin(angleRad) * radius,
        (angleRad * 180) / Math.PI,
      ),
    );
  }
  return slots;
}

// ==================== U 型桌：底部 + 左翼 + 右翼 ====================
function uShapeSlots(w: number, h: number, count: number): SeatSlot[] {
  const armDepth = 0.6;
  const bottomInner = Math.max(0, w - 2 * armDepth);
  const sideInner = Math.max(0, h - armDepth);
  const total = bottomInner + sideInner * 2;
  if (total === 0) return [];

  const maxCap = Math.floor(total / (CHAIR_SIZE + CHAIR_GAP));
  const actual = Math.min(count, maxCap);

  const bottomCount = Math.round((actual * bottomInner) / total);
  const sideCount = actual - bottomCount;
  const leftCount = Math.ceil(sideCount / 2);
  const rightCount = sideCount - leftCount;

  const slots: SeatSlot[] = [];

  // 底部内侧（朝上，面向屏幕方向）
  for (let i = 0; i < bottomCount; i++) {
    const t = bottomCount > 1 ? i / (bottomCount - 1) : 0.5;
    slots.push(
      makeSlot(
        `slot-${slots.length}`,
        -bottomInner / 2 + t * bottomInner,
        -h / 2 + armDepth / 2 - CHAIR_SIZE / 2,
        0,
      ),
    );
  }
  // 左翼（朝右，面向 U 型中心）
  for (let i = 0; i < leftCount; i++) {
    const t = leftCount > 1 ? i / (leftCount - 1) : 0.5;
    slots.push(
      makeSlot(
        `slot-${slots.length}`,
        -w / 2 + armDepth / 2 - CHAIR_SIZE / 2,
        -sideInner / 2 + t * sideInner,
        90,
      ),
    );
  }
  // 右翼（朝左）
  for (let i = 0; i < rightCount; i++) {
    const t = rightCount > 1 ? i / (rightCount - 1) : 0.5;
    slots.push(
      makeSlot(
        `slot-${slots.length}`,
        w / 2 - armDepth / 2 + CHAIR_SIZE / 2,
        -sideInner / 2 + t * sideInner,
        270,
      ),
    );
  }
  return slots;
}

// ==================== 主席台：单侧朝下（朝观众） ====================
function headSlots(w: number, h: number, count: number): SeatSlot[] {
  const avail = Math.max(0, w - 0.5);
  const maxCap = Math.floor(avail / (CHAIR_SIZE + CHAIR_GAP));
  const actual = Math.min(count, maxCap);
  const slots: SeatSlot[] = [];
  for (let i = 0; i < actual; i++) {
    const t = actual > 1 ? i / (actual - 1) : 0.5;
    slots.push(
      makeSlot(`slot-${i}`, -w / 2 + 0.25 + t * avail, h / 2 + CHAIR_SIZE / 2, 180),
    );
  }
  return slots;
}

function makeSlot(id: string, localX: number, localY: number, angle: number): SeatSlot {
  return { id, localX, localY, angle, isFreeFloating: false };
}
