// M0-6: 核心数据类型 — 来源于 PRD §5 数据模型
// 所有坐标以米为单位；角度以度为单位。

// ==================== 场地元素 ====================
export type VenueElementType = 'wall' | 'door' | 'window' | 'pillar' | 'stage' | 'screen';

export interface VenueElement {
  id: string;
  type: VenueElementType;
  x: number; // 米，距左墙
  y: number; // 米，距上墙
  width: number; // 米
  height: number; // 米
  rotation: number; // 度
  locked?: boolean;
  /** 该元素依附的墙体 id，仅门/窗/屏使用 */
  attachedTo?: string;
}

// ==================== 桌椅 ====================
export type TableType = 'conference-long' | 'training-desk' | 'u-shape' | 'round' | 'head';

export interface SeatSlot {
  id: string;
  /** 相对于桌子中心的 X 偏移（米） */
  localX: number;
  /** 相对于桌子中心的 Y 偏移（米） */
  localY: number;
  /** 椅子朝向角度（度），0 表示朝上 */
  angle: number;
  occupantId?: string;
  isFreeFloating: boolean;
  freeX?: number;
  freeY?: number;
  freeAngle?: number;
}

export interface Table {
  id: string;
  type: TableType;
  /** 桌子中心点 X（米） */
  x: number;
  /** 桌子中心点 Y（米） */
  y: number;
  width: number;
  height: number;
  rotation: number;
  tableNumber: string;
  capacity: number;
  seatSlots: SeatSlot[];
  locked?: boolean;
}

// ==================== 场地 ====================
export interface Venue {
  id: string;
  name: string;
  width: number;
  height: number;
  /** 像素/米，如 50 表示 1m=50px */
  scale: number;
  elements: VenueElement[];
  tables: Table[];
}

// ==================== 参会者 ====================
export type PersonalTag = 'vip' | 'host' | 'speaker';
export type Satisfaction = 'high' | 'medium' | 'low';
export type Gender = 'male' | 'female';

export interface Guest {
  id: string;
  name: string;
  phone?: string;
  gender?: Gender;
  department?: string;
  level?: string;
  tags: PersonalTag[];
  dietaryRestrictions?: string;
  specialNeeds?: string;
  tableId?: string;
  seatSlotId?: string;
  seatPinned: boolean;
  satisfaction: Satisfaction;
}

// ==================== 关系与规则 ====================
export type RelationType = 'must-adjacent' | 'prefer-same-table' | 'must-isolate';
export type ConstraintLevel = 'hard' | 'soft';

export interface GuestRelation {
  id: string;
  guestAId: string;
  guestBId: string;
  type: RelationType;
  constraintLevel: ConstraintLevel;
}

export type RuleScene = 'corporate' | 'government' | 'general';

export type ConstraintKind =
  | 'isolate'
  | 'adjacent'
  | 'same-table'
  | 'same-area'
  | 'priority-front'
  | 'priority-center';

export interface ConstraintRule {
  kind: ConstraintKind;
  guestIds: string[];
  areaId?: string;
  priority?: number;
}

export interface Constraint {
  id: string;
  type: ConstraintLevel;
  weight: number;
  rule: ConstraintRule;
}

// ==================== 会议类型（自动布局） ====================
export type MeetingType = 'report' | 'training' | 'negotiation' | 'round-table';

// ==================== 命令（撤销/重做） ====================
export interface Command {
  type: string;
  description: string;
  execute(): void;
  undo(): void;
}

// ==================== 通用几何 ====================
export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}
