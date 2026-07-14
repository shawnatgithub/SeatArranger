// M3-1 & M3-2: 自动布局策略 — 参考 PRD §4.3 会议类型策略
import type { MeetingType, Table, Venue, VenueElement } from '@/types';
import { calculateSeatSlots, CHAIR_SIZE, CHAIR_GAP } from './seatSlots';

/** 桌子距墙至少间距（米） */
const TABLE_WALL_MARGIN = 0.5;
/** 桌子间通道（米） */
const AISLE = 0.8;

/**
 * 根据会议室尺寸、参会人数和会议类型生成桌子列表。
 * - 尊重 venue.tables 中已 locked 的桌子（不动）
 * - 尊重 venue.elements 中已 locked 的屏幕/主席台（作为对称基准）
 */
export function autoLayout(venue: Venue, headcount: number, meetingType: MeetingType): Table[] {
  const lockedTables = venue.tables.filter((t) => t.locked);
  const anchorX = findAnchorX(venue);

  switch (meetingType) {
    case 'report':
      return [...lockedTables, ...reportLayout(venue, headcount, anchorX)];
    case 'training':
      return [...lockedTables, ...trainingLayout(venue, headcount, anchorX)];
    case 'negotiation':
      return [...lockedTables, ...negotiationLayout(venue, headcount, anchorX)];
    case 'round-table':
      return [...lockedTables, ...roundTableLayout(venue, headcount)];
    default:
      return lockedTables;
  }
}

/** 若前墙锁定屏幕，返回屏幕中心 x，否则返回房间中线 */
function findAnchorX(venue: Venue): number {
  const lockedScreen = venue.elements.find(
    (e: VenueElement) => e.locked && (e.type === 'screen' || e.type === 'stage'),
  );
  if (lockedScreen) return lockedScreen.x + lockedScreen.width / 2;
  return venue.width / 2;
}

// ==================== 汇报：主席台 + 听众课桌 ====================
function reportLayout(venue: Venue, headcount: number, anchorX: number): Table[] {
  const tables: Table[] = [];

  // 1) 主席台居中，紧贴前墙
  const stageWidth = Math.min(4, venue.width - 2 * TABLE_WALL_MARGIN);
  const stageHeight = 1;
  const stageChairs = 3;
  tables.push(
    makeTable('head-1', 'head', anchorX, TABLE_WALL_MARGIN + stageHeight / 2, stageWidth, stageHeight, '主席台', stageChairs),
  );

  // 2) 听众席：从 y = TABLE_WALL_MARGIN + stageHeight + 1.2 开始
  const audienceStart = TABLE_WALL_MARGIN + stageHeight + 1.2;
  const audienceHeadcount = Math.max(0, headcount - stageChairs);
  tables.push(
    ...gridDesks(venue, audienceStart, audienceHeadcount, anchorX, /*rowGap*/ 1.5, 'training-desk'),
  );
  return tables;
}

// ==================== 培训：课桌矩阵 ====================
function trainingLayout(venue: Venue, headcount: number, anchorX: number): Table[] {
  return gridDesks(venue, TABLE_WALL_MARGIN + 0.5, headcount, anchorX, 1.5, 'training-desk');
}

// ==================== 谈判：主客双方对坐 ====================
function negotiationLayout(venue: Venue, headcount: number, anchorX: number): Table[] {
  // 双侧长桌，中间通道 1.5m
  const half = Math.ceil(headcount / 2);
  const perTable = 4;
  const nTables = Math.max(1, Math.ceil(half / perTable));
  const tableW = Math.min(3, (venue.width - 2 * TABLE_WALL_MARGIN - AISLE) / 2);
  const tableH = 1;

  const tables: Table[] = [];
  const leftX = anchorX - AISLE / 2 - tableW / 2;
  const rightX = anchorX + AISLE / 2 + tableW / 2;
  const usableH = venue.height - 2 * TABLE_WALL_MARGIN;
  const gap = nTables > 1 ? (usableH - nTables * tableH) / (nTables + 1) : (usableH - tableH) / 2;

  for (let i = 0; i < nTables; i++) {
    const y = TABLE_WALL_MARGIN + gap * (i + 1) + tableH * (i + 0.5);
    tables.push(
      makeTable(`neg-L-${i}`, 'conference-long', leftX, y, tableW, tableH, `甲方 ${i + 1}`, perTable),
      makeTable(`neg-R-${i}`, 'conference-long', rightX, y, tableW, tableH, `乙方 ${i + 1}`, perTable),
    );
  }
  return tables;
}

// ==================== 圆桌：中央均匀分布 ====================
function roundTableLayout(venue: Venue, headcount: number): Table[] {
  const capacityPer = 8;
  const nTables = Math.max(1, Math.ceil(headcount / capacityPer));
  const diameter = 1.6;
  const perRow = Math.max(1, Math.floor((venue.width - 2 * TABLE_WALL_MARGIN) / (diameter + 1.2)));
  const rows = Math.ceil(nTables / perRow);
  const stepX = (venue.width - 2 * TABLE_WALL_MARGIN) / perRow;
  const stepY = (venue.height - 2 * TABLE_WALL_MARGIN) / (rows + 1);

  const tables: Table[] = [];
  let idx = 0;
  for (let r = 0; r < rows && idx < nTables; r++) {
    const remaining = Math.min(perRow, nTables - idx);
    for (let c = 0; c < remaining; c++, idx++) {
      const x = TABLE_WALL_MARGIN + stepX * (c + 0.5);
      const y = TABLE_WALL_MARGIN + stepY * (r + 1);
      tables.push(makeTable(`round-${idx}`, 'round', x, y, diameter, diameter, `圆桌 ${idx + 1}`, capacityPer));
    }
  }
  return tables;
}

// ==================== 公共：矩阵课桌 ====================
function gridDesks(
  venue: Venue,
  startY: number,
  headcount: number,
  anchorX: number,
  rowGap: number,
  tableType: 'training-desk' | 'conference-long',
): Table[] {
  if (headcount <= 0) return [];
  const perTable = 4;
  const tableW = 1.5;
  const tableH = 0.6;
  const nTables = Math.ceil(headcount / perTable);
  const usableW = venue.width - 2 * TABLE_WALL_MARGIN;
  const maxPerRow = Math.max(1, Math.floor(usableW / (tableW + CHAIR_GAP + AISLE / 2)));
  const perRow = Math.min(maxPerRow, Math.max(2, Math.ceil(Math.sqrt(nTables))));
  const rows = Math.ceil(nTables / perRow);
  const stepX = usableW / perRow;

  const tables: Table[] = [];
  let idx = 0;
  for (let r = 0; r < rows && idx < nTables; r++) {
    const remaining = Math.min(perRow, nTables - idx);
    // 每行以 anchorX 为中线均匀分布
    const rowWidth = remaining * stepX;
    const rowStartX = anchorX - rowWidth / 2 + stepX / 2;
    for (let c = 0; c < remaining; c++, idx++) {
      const y = startY + (rowGap + tableH) * r + tableH / 2;
      const x = rowStartX + stepX * c;
      // 简单越界检查
      if (y + tableH / 2 > venue.height - TABLE_WALL_MARGIN) break;
      tables.push(
        makeTable(`${tableType}-${idx}`, tableType, x, y, tableW, tableH, `第 ${r + 1} 排 - ${c + 1}`, perTable),
      );
    }
  }
  return tables;
}

// ==================== 工厂 ====================
function makeTable(
  id: string,
  type: Table['type'],
  x: number,
  y: number,
  width: number,
  height: number,
  tableNumber: string,
  chairCount: number,
): Table {
  const seatSlots = calculateSeatSlots(width, height, type, chairCount);
  return {
    id,
    type,
    x,
    y,
    width,
    height,
    rotation: 0,
    tableNumber,
    capacity: seatSlots.length || chairCount,
    seatSlots,
    locked: false,
  };
}

export { CHAIR_SIZE, CHAIR_GAP };
