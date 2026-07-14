// M3-5 & M3-6: 贪心分配引擎 — 参考 PRD §6.4
import type { Constraint, Guest, SeatSlot, Table } from '@/types';
import { slotToGlobal } from '@/domain/geometry';
import { scoreAssignment, type ScoreResult } from '@/domain/scoring/score';

/** M3-6 硬性性能预算（毫秒） */
export const ENGINE_PERF_BUDGET_MS = 3000;

export interface AssignResult {
  tables: Table[];
  guests: Guest[];
  unassigned: Guest[];
  score: ScoreResult;
}

interface SlotHandle {
  tableId: string;
  slotId: string;
  x: number;
  y: number;
  tableY: number;
}

/**
 * 贪心 + 硬约束回溯降级的座位分配。
 *
 * 策略：
 *  1) 处理 pinned 已固定的 guest
 *  2) 用并查集把 adjacent/same-table 硬约束的 guest 分组（cluster）
 *  3) cluster 按大小降序放置：为整组选一张剩余座位足够的桌子，放到相邻座位
 *  4) 处理 isolate 硬约束：若同组则拆分（fallback）
 *  5) 剩余 guest 按优先级排队（VIP > host/speaker > 其他），逐个贪心选座
 */
export function assignSeats(
  tables: Table[],
  guests: Guest[],
  constraints: Constraint[],
): AssignResult {
  const workTables = tables.map((t) => ({
    ...t,
    seatSlots: t.seatSlots.map((s) => ({ ...s })),
  }));
  const workGuests = guests.map((g) => ({ ...g }));
  const guestMap = new Map(workGuests.map((g) => [g.id, g]));

  // 1) 应用 pinned
  const pinnedSet = new Set<string>();
  for (const g of workGuests) {
    if (g.seatPinned && g.seatSlotId) {
      const t = workTables.find((tt) => tt.id === g.tableId);
      const s = t?.seatSlots.find((ss) => ss.id === g.seatSlotId);
      if (s) {
        s.occupantId = g.id;
        pinnedSet.add(g.id);
      }
    }
  }

  // 2) cluster 分组
  const hardAdj = constraints.filter(
    (c) => c.type === 'hard' && (c.rule.kind === 'adjacent' || c.rule.kind === 'same-table'),
  );
  const hardIsolate = constraints.filter((c) => c.type === 'hard' && c.rule.kind === 'isolate');
  const clusters = buildClusters(
    workGuests.filter((g) => !pinnedSet.has(g.id)),
    hardAdj,
  );

  // 收集所有可用 slot 索引（不含 pinned 已用）
  const available = collectAvailable(workTables);
  const unassigned: Guest[] = [];
  const start = performance.now();

  // 3) cluster 优先放置（大 → 小）
  clusters.sort((a, b) => b.length - a.length);
  for (const group of clusters) {
    if (performance.now() - start > ENGINE_PERF_BUDGET_MS) {
      group.forEach((id) => unassigned.push(guestMap.get(id)!));
      continue;
    }
    if (group.length === 1) continue; // 交给下一阶段
    const placed = placeClusterOnTable(group, workTables, available, hardIsolate, guestMap);
    if (!placed) {
      // 拆分：单独按贪心
      for (const id of group) {
        const g = guestMap.get(id)!;
        if (!placeSingleGuest(g, workTables, available, constraints, guestMap)) {
          unassigned.push(g);
        }
      }
    }
  }

  // 4) 剩余单人（含 group.length===1）按优先级放置
  const remaining = workGuests
    .filter((g) => !pinnedSet.has(g.id) && !g.seatSlotId)
    .sort((a, b) => guestPriority(b, constraints) - guestPriority(a, constraints));

  for (const g of remaining) {
    if (performance.now() - start > ENGINE_PERF_BUDGET_MS) {
      unassigned.push(g);
      continue;
    }
    if (!placeSingleGuest(g, workTables, available, constraints, guestMap)) {
      unassigned.push(g);
    }
  }

  const score = scoreAssignment(workTables, workGuests, constraints);
  return { tables: workTables, guests: workGuests, unassigned, score };
}

// ==================== cluster ====================
function buildClusters(guests: Guest[], hardAdj: Constraint[]): string[][] {
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== parent.get(p)) {
      const gp = parent.get(p)!;
      parent.set(p, parent.get(gp) ?? gp);
      p = parent.get(p) ?? p;
    }
    parent.set(x, p);
    return p;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const g of guests) parent.set(g.id, g.id);
  for (const c of hardAdj) {
    const [a, b] = c.rule.guestIds;
    if (parent.has(a) && parent.has(b)) union(a, b);
  }
  const groups = new Map<string, string[]>();
  for (const g of guests) {
    const r = find(g.id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(g.id);
  }
  return Array.from(groups.values());
}

function placeClusterOnTable(
  group: string[],
  tables: Table[],
  available: SlotHandle[],
  hardIsolate: Constraint[],
  guestMap: Map<string, Guest>,
): boolean {
  // 按表分组可用 slot；找一张剩余席位 ≥ group.length 的桌子
  const perTable = new Map<string, SlotHandle[]>();
  for (const s of available) {
    if (!perTable.has(s.tableId)) perTable.set(s.tableId, []);
    perTable.get(s.tableId)!.push(s);
  }
  // 排除会引入 isolate 冲突的桌子（若 group 内两人之间有 isolate 硬约束，则 group 必分裂）
  for (const iso of hardIsolate) {
    const [a, b] = iso.rule.guestIds;
    if (group.includes(a) && group.includes(b)) return false;
  }
  const candidates = Array.from(perTable.entries())
    .filter(([, slots]) => slots.length >= group.length)
    .sort((a, b) => a[1].length - b[1].length); // 优先容量最贴合
  if (candidates.length === 0) return false;

  const [tableId, tableSlots] = candidates[0];
  // 按 slotId 顺序（保持局部相邻）
  const slotsCopy = [...tableSlots].sort((a, b) => a.x - b.x || a.y - b.y);
  for (let i = 0; i < group.length; i++) {
    const guestId = group[i];
    const cand = slotsCopy[i];
    const t = tables.find((tt) => tt.id === tableId)!;
    const seat = t.seatSlots.find((ss) => ss.id === cand.slotId)!;
    seat.occupantId = guestId;
    const g = guestMap.get(guestId)!;
    g.tableId = tableId;
    g.seatSlotId = cand.slotId;
    const idx = available.indexOf(cand);
    if (idx >= 0) available.splice(idx, 1);
  }
  return true;
}

// ==================== 单人放置 ====================
function placeSingleGuest(
  guest: Guest,
  tables: Table[],
  available: SlotHandle[],
  constraints: Constraint[],
  guestMap: Map<string, Guest>,
): boolean {
  if (available.length === 0) return false;
  const order = rankCandidates(guest, available, tables, constraints);
  for (const idx of order) {
    const cand = available[idx];
    if (!cand) continue;
    // 检查是否与已放置的 isolate 伙伴同表
    if (violatesIsolate(guest.id, cand.tableId, constraints, guestMap)) continue;
    const t = tables.find((tt) => tt.id === cand.tableId)!;
    const seat = t.seatSlots.find((ss) => ss.id === cand.slotId)!;
    seat.occupantId = guest.id;
    guest.tableId = cand.tableId;
    guest.seatSlotId = cand.slotId;
    available.splice(idx, 1);
    return true;
  }
  // 全部候选都违反 → 降级：使用第一个可用槽
  const cand = available[0];
  const t = tables.find((tt) => tt.id === cand.tableId)!;
  const seat = t.seatSlots.find((ss) => ss.id === cand.slotId)!;
  seat.occupantId = guest.id;
  guest.tableId = cand.tableId;
  guest.seatSlotId = cand.slotId;
  available.splice(0, 1);
  return true;
}

function violatesIsolate(
  guestId: string,
  tableId: string,
  constraints: Constraint[],
  guestMap: Map<string, Guest>,
): boolean {
  for (const c of constraints) {
    if (c.rule.kind !== 'isolate' || c.type !== 'hard') continue;
    if (!c.rule.guestIds.includes(guestId)) continue;
    const other = c.rule.guestIds.find((id) => id !== guestId);
    if (!other) continue;
    const partner = guestMap.get(other);
    if (partner?.tableId === tableId) return true;
  }
  return false;
}

// ==================== 排序 & 打分 ====================
function guestPriority(g: Guest, constraints: Constraint[]): number {
  let p = 0;
  if (g.tags.includes('vip')) p += 100;
  if (g.tags.includes('host') || g.tags.includes('speaker')) p += 50;
  if (constraints.some((c) => c.type === 'hard' && c.rule.guestIds.includes(g.id))) p += 30;
  return p;
}

function rankCandidates(
  guest: Guest,
  available: SlotHandle[],
  tables: Table[],
  constraints: Constraint[],
): number[] {
  const partners: Array<{ tableId: string; x: number; y: number; want: 'near' | 'far' | 'same' }> = [];
  for (const c of constraints) {
    if (!c.rule.guestIds.includes(guest.id)) continue;
    const otherId = c.rule.guestIds.find((id) => id !== guest.id);
    if (!otherId) continue;
    const p = findGuestPos(otherId, tables);
    if (!p) continue;
    if (c.rule.kind === 'adjacent') partners.push({ ...p, want: 'near' });
    else if (c.rule.kind === 'same-table') partners.push({ ...p, want: 'same' });
    else if (c.rule.kind === 'isolate') partners.push({ ...p, want: 'far' });
  }
  const wantFront = constraints.some(
    (c) => c.rule.kind === 'priority-front' && c.rule.guestIds.includes(guest.id),
  );
  return available
    .map((slot, i) => ({ i, score: scoreCandidate(slot, partners, wantFront) }))
    .sort((a, b) => b.score - a.score)
    .map((e) => e.i);
}

function scoreCandidate(
  slot: SlotHandle,
  partners: Array<{ tableId: string; x: number; y: number; want: 'near' | 'far' | 'same' }>,
  wantFront: boolean,
): number {
  let s = 0;
  for (const p of partners) {
    const d = Math.hypot(slot.x - p.x, slot.y - p.y);
    if (p.want === 'near') s += Math.max(0, 5 - d);
    else if (p.want === 'far') s += Math.min(10, d);
    else if (p.want === 'same') s += p.tableId === slot.tableId ? 5 : -5;
  }
  if (wantFront) s += Math.max(0, 20 - slot.y);
  return s;
}

function findGuestPos(guestId: string, tables: Table[]): { tableId: string; x: number; y: number } | null {
  for (const t of tables) {
    for (const s of t.seatSlots) {
      if (s.occupantId === guestId) {
        const g = slotToGlobal({ localX: s.localX, localY: s.localY, angle: s.angle }, t);
        return { tableId: t.id, x: g.x, y: g.y };
      }
    }
  }
  return null;
}

function collectAvailable(tables: Table[]): SlotHandle[] {
  const arr: SlotHandle[] = [];
  for (const t of tables) {
    for (const s of t.seatSlots) {
      if (s.occupantId) continue;
      const g = slotToGlobal({ localX: s.localX, localY: s.localY, angle: s.angle }, t);
      arr.push({ tableId: t.id, slotId: s.id, x: g.x, y: g.y, tableY: t.y });
    }
  }
  arr.sort((a, b) => a.y - b.y || a.x - b.x);
  return arr;
}
