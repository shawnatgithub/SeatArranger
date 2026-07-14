// M1-4 & M1-5: 矩形碰撞检测（含旋转的 SAT）+ 冲突解析
import type { Point, Rect } from '@/types';

export interface CollidableRect extends Rect {
  id?: string;
  locked?: boolean;
}

/** 计算矩形四个角点（考虑旋转，围绕左上角 (x,y) 旋转） */
function corners(r: Rect): Point[] {
  const rad = (r.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const hw = r.width / 2;
  const hh = r.height / 2;
  const raw: Point[] = [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
  return raw.map((p) => ({
    x: cx + p.x * cos - p.y * sin,
    y: cy + p.x * sin + p.y * cos,
  }));
}

/** 将点投影到轴上得到 [min, max] 区间 */
function project(points: Point[], axis: Point): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const dot = p.x * axis.x + p.y * axis.y;
    if (dot < min) min = dot;
    if (dot > max) max = dot;
  }
  return { min, max };
}

function overlap(a: { min: number; max: number }, b: { min: number; max: number }): boolean {
  return a.max >= b.min && b.max >= a.min;
}

/** 分离轴定理判断两个（可能旋转的）矩形是否相交 */
export function checkCollision(a: Rect, b: Rect): boolean {
  const cornersA = corners(a);
  const cornersB = corners(b);

  const axes: Point[] = [];
  for (const rectCorners of [cornersA, cornersB]) {
    for (let i = 0; i < 4; i++) {
      const p1 = rectCorners[i];
      const p2 = rectCorners[(i + 1) % 4];
      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      // 法线（垂直于边）
      axes.push({ x: -edge.y, y: edge.x });
    }
  }

  for (const axis of axes) {
    const len = Math.hypot(axis.x, axis.y);
    if (len === 0) continue;
    const norm = { x: axis.x / len, y: axis.y / len };
    const projA = project(cornersA, norm);
    const projB = project(cornersB, norm);
    if (!overlap(projA, projB)) return false;
  }
  return true;
}

/** 沿最短方向把 moved 推离 other（AABB 简化，旋转情形以中心方向推离） */
function pushAway(moved: Rect, other: Rect): Point {
  const cxA = moved.x + moved.width / 2;
  const cyA = moved.y + moved.height / 2;
  const cxB = other.x + other.width / 2;
  const cyB = other.y + other.height / 2;

  const dx = cxA - cxB;
  const dy = cyA - cyB;

  const overlapX = (moved.width + other.width) / 2 - Math.abs(dx);
  const overlapY = (moved.height + other.height) / 2 - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) return { x: moved.x, y: moved.y };

  if (overlapX < overlapY) {
    const shift = dx >= 0 ? overlapX : -overlapX;
    return { x: moved.x + shift, y: moved.y };
  }
  const shift = dy >= 0 ? overlapY : -overlapY;
  return { x: moved.x, y: moved.y + shift };
}

/**
 * PRD §4.2.4：碰撞解析尊重 locked 标志。
 * - 当前元素 locked → 不动
 * - 对方 locked → 只能推走当前
 * - 双方 free → 推走当前
 */
export function resolveCollision(
  moved: CollidableRect,
  others: readonly CollidableRect[],
): Point {
  let pos: Point = { x: moved.x, y: moved.y };
  let current: CollidableRect = { ...moved };

  for (const other of others) {
    if (other.id !== undefined && moved.id !== undefined && other.id === moved.id) continue;
    if (!checkCollision(current, other)) continue;

    if (current.locked) return { x: moved.x, y: moved.y };
    // pushAway 无论 other.locked 与否，均由当前元素让位
    pos = pushAway(current, other);
    current = { ...current, x: pos.x, y: pos.y };
  }
  return pos;
}
