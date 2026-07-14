// M3-4: 座位方案评分 — 参考 PRD §4.4 权重表
import type { Constraint, Guest, Satisfaction, Table } from '@/types';
import { slotToGlobal } from '@/domain/geometry';

/** 相邻判定阈值（米）— 同桌相邻座位距离通常 ≤ 0.8 */
const ADJACENT_DISTANCE = 0.9;

export interface ViolationRecord {
  constraintId: string;
  rule: Constraint['rule'];
  weight: number;
}

export interface ScoreResult {
  total: number;
  violations: ViolationRecord[];
  /** 每个 guest 的净得分（用于满意度分级） */
  perGuest: Record<string, number>;
}

/**
 * 根据当前 tables + guests 计算约束满足情况和总分。
 * - 每条 constraint 若满足：total += weight；若违反且为 hard：total -= weight 并计入 violations。
 * - 软约束违反：total -= weight * 0.5（打折扣，不计入 violations）。
 * - perGuest 记录每个参与者的得失，供 evaluateGuestSatisfaction 使用。
 */
export function scoreAssignment(
  tables: Table[],
  guests: Guest[],
  constraints: Constraint[],
): ScoreResult {
  const guestMap = new Map(guests.map((g) => [g.id, g]));
  // 计算每个 guest 的全局坐标 + 所在桌
  const positions = collectPositions(tables);
  const perGuest: Record<string, number> = {};
  const bump = (id: string, delta: number) => {
    perGuest[id] = (perGuest[id] ?? 0) + delta;
  };

  const roomFrontY = computeFrontY(tables);
  const roomCenter = computeCenter(tables);

  let total = 0;
  const violations: ViolationRecord[] = [];

  for (const c of constraints) {
    const { rule, weight, type } = c;
    switch (rule.kind) {
      case 'adjacent': {
        const [a, b] = rule.guestIds;
        const pa = positions.get(a);
        const pb = positions.get(b);
        if (!pa || !pb) continue;
        const dist = Math.hypot(pa.x - pb.x, pa.y - pb.y);
        const satisfied = pa.tableId === pb.tableId && dist <= ADJACENT_DISTANCE;
        if (satisfied) {
          total += weight;
          bump(a, weight / 2);
          bump(b, weight / 2);
        } else if (type === 'hard') {
          total -= weight;
          violations.push({ constraintId: c.id, rule, weight });
          bump(a, -weight / 2);
          bump(b, -weight / 2);
        } else {
          total -= weight * 0.5;
        }
        break;
      }
      case 'isolate': {
        const [a, b] = rule.guestIds;
        const pa = positions.get(a);
        const pb = positions.get(b);
        if (!pa || !pb) continue;
        const violated = pa.tableId === pb.tableId;
        if (!violated) {
          total += weight;
          bump(a, weight / 2);
          bump(b, weight / 2);
        } else {
          total -= weight;
          bump(a, -weight / 2);
          bump(b, -weight / 2);
          if (type === 'hard') {
            violations.push({ constraintId: c.id, rule, weight });
          }
        }
        break;
      }
      case 'same-table': {
        const [a, b] = rule.guestIds;
        const pa = positions.get(a);
        const pb = positions.get(b);
        if (!pa || !pb) continue;
        if (pa.tableId === pb.tableId) {
          total += weight;
          bump(a, weight / 2);
          bump(b, weight / 2);
        } else if (type === 'hard') {
          total -= weight;
          violations.push({ constraintId: c.id, rule, weight });
        } else {
          total -= weight * 0.5;
        }
        break;
      }
      case 'priority-front': {
        const [id] = rule.guestIds;
        const p = positions.get(id);
        if (!p) continue;
        // 越靠前（y 越小）得分越高，范围归一化到 [0,1]
        const rangeY = Math.max(1, computeBackY(tables) - roomFrontY);
        const ratio = 1 - Math.max(0, Math.min(1, (p.y - roomFrontY) / rangeY));
        const gained = weight * ratio;
        total += gained;
        bump(id, gained);
        // guest 未上座
        if (!guestMap.get(id)?.seatSlotId && ratio < 0.4 && type === 'hard') {
          violations.push({ constraintId: c.id, rule, weight });
        }
        break;
      }
      case 'priority-center': {
        const [id] = rule.guestIds;
        const p = positions.get(id);
        if (!p) continue;
        const distToCenter = Math.hypot(p.x - roomCenter.x, p.y - roomCenter.y);
        const rangeR = Math.max(1, computeMaxRadius(tables, roomCenter));
        const ratio = 1 - Math.max(0, Math.min(1, distToCenter / rangeR));
        const gained = weight * ratio;
        total += gained;
        bump(id, gained);
        break;
      }
      default:
        break;
    }
  }

  return { total, violations, perGuest };
}

/** 按每个 guest 的净得分把满意度映射为 high/medium/low */
export function evaluateGuestSatisfaction(_guest: Guest, score: number): Satisfaction {
  if (score >= 10) return 'high';
  if (score >= -10) return 'medium';
  return 'low';
}

// ==================== 内部工具 ====================
interface Position {
  x: number;
  y: number;
  tableId: string;
}

function collectPositions(tables: Table[]): Map<string, Position> {
  const map = new Map<string, Position>();
  for (const t of tables) {
    for (const s of t.seatSlots) {
      if (!s.occupantId) continue;
      if (s.isFreeFloating && s.freeX !== undefined && s.freeY !== undefined) {
        map.set(s.occupantId, { x: s.freeX, y: s.freeY, tableId: t.id });
        continue;
      }
      const g = slotToGlobal({ localX: s.localX, localY: s.localY, angle: s.angle }, t);
      map.set(s.occupantId, { x: g.x, y: g.y, tableId: t.id });
    }
  }
  return map;
}

function computeFrontY(tables: Table[]): number {
  if (tables.length === 0) return 0;
  return Math.min(...tables.map((t) => t.y - t.height / 2));
}

function computeBackY(tables: Table[]): number {
  if (tables.length === 0) return 0;
  return Math.max(...tables.map((t) => t.y + t.height / 2));
}

function computeCenter(tables: Table[]): { x: number; y: number } {
  if (tables.length === 0) return { x: 0, y: 0 };
  const xs = tables.map((t) => t.x);
  const ys = tables.map((t) => t.y);
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2,
  };
}

function computeMaxRadius(tables: Table[], center: { x: number; y: number }): number {
  let max = 0;
  for (const t of tables) {
    const d = Math.hypot(t.x - center.x, t.y - center.y);
    if (d > max) max = d;
  }
  return max;
}
