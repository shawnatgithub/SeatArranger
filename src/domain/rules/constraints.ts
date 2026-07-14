// M3-3: 关系 + 个人标签 → 约束 DSL 构建器
// 参考 PRD §4.4 规则引擎
import type { Constraint, Guest, GuestRelation, PersonalTag } from '@/types';

/** 各类约束的默认权重（PRD §4.4 权重表） */
export const CONSTRAINT_WEIGHTS = {
  adjacent: 20,
  isolate: 40,
  sameTable: 10,
  priorityFront: 15,
  priorityCenter: 15,
  /** VIP 标签放大系数 */
  vipMultiplier: 3,
} as const;

/**
 * 由 GuestRelation[] 与 Guest[]（含 PersonalTag）构建 Constraint[]。
 *
 * 映射规则：
 * - must-adjacent → adjacent 硬约束
 * - must-isolate → isolate 硬约束
 * - prefer-same-table → same-table 软约束
 * - guest.tags 含 'vip' → priority-front 软约束（权重 × vipMultiplier）
 * - guest.tags 含 'host' | 'speaker' → priority-center 软约束
 *
 * 引用未知 guest 的 relation 会被静默丢弃。
 */
export function buildConstraints(
  relations: GuestRelation[],
  guests: Guest[],
): Constraint[] {
  const known = new Set(guests.map((g) => g.id));
  const constraints: Constraint[] = [];

  // 1) 关系型约束
  for (const rel of relations) {
    if (!known.has(rel.guestAId) || !known.has(rel.guestBId)) continue;
    const ids = [rel.guestAId, rel.guestBId];
    switch (rel.type) {
      case 'must-adjacent':
        constraints.push({
          id: `c-adj-${rel.id}`,
          type: rel.constraintLevel,
          weight: CONSTRAINT_WEIGHTS.adjacent,
          rule: { kind: 'adjacent', guestIds: ids },
        });
        break;
      case 'must-isolate':
        constraints.push({
          id: `c-iso-${rel.id}`,
          type: rel.constraintLevel,
          weight: CONSTRAINT_WEIGHTS.isolate,
          rule: { kind: 'isolate', guestIds: ids },
        });
        break;
      case 'prefer-same-table':
        constraints.push({
          id: `c-st-${rel.id}`,
          type: rel.constraintLevel,
          weight: CONSTRAINT_WEIGHTS.sameTable,
          rule: { kind: 'same-table', guestIds: ids },
        });
        break;
      default:
        break;
    }
  }

  // 2) 个人标签约束
  for (const g of guests) {
    if (hasTag(g.tags, 'vip')) {
      constraints.push({
        id: `c-vipfront-${g.id}`,
        type: 'soft',
        weight: CONSTRAINT_WEIGHTS.priorityFront * CONSTRAINT_WEIGHTS.vipMultiplier,
        rule: { kind: 'priority-front', guestIds: [g.id] },
      });
    }
    if (hasTag(g.tags, 'host') || hasTag(g.tags, 'speaker')) {
      constraints.push({
        id: `c-center-${g.id}`,
        type: 'soft',
        weight: CONSTRAINT_WEIGHTS.priorityCenter,
        rule: { kind: 'priority-center', guestIds: [g.id] },
      });
    }
  }

  return constraints;
}

function hasTag(tags: PersonalTag[], target: PersonalTag): boolean {
  return tags.includes(target);
}
