// M1-1 & M1-2: 坐标转换 — 米 <-> 像素 <-> Konva 舞台
import type { Point } from '@/types';

/** 默认比例尺：1m = 50px */
export const SCALE_DEFAULT = 50;

export function metersToPixels(meters: number, scale: number = SCALE_DEFAULT): number {
  return meters * scale;
}

export function pixelsToMeters(px: number, scale: number = SCALE_DEFAULT): number {
  return px / scale;
}

/**
 * 从 Konva 事件坐标（受 stage 缩放/平移影响）还原为真实米坐标。
 * 步骤：减 stagePos → 除 stageScale → 除 scale。
 */
export function konvaToMeters(
  konvaX: number,
  konvaY: number,
  stageScale: number,
  stagePos: Point,
  scale: number = SCALE_DEFAULT,
): Point {
  const realPxX = (konvaX - stagePos.x) / stageScale;
  const realPxY = (konvaY - stagePos.y) / stageScale;
  return {
    x: pixelsToMeters(realPxX, scale),
    y: pixelsToMeters(realPxY, scale),
  };
}

/** 米 -> Konva 坐标（考虑 stage 缩放/平移） */
export function metersToKonva(
  metersX: number,
  metersY: number,
  stageScale: number,
  stagePos: Point,
  scale: number = SCALE_DEFAULT,
): Point {
  const pxX = metersToPixels(metersX, scale);
  const pxY = metersToPixels(metersY, scale);
  return {
    x: pxX * stageScale + stagePos.x,
    y: pxY * stageScale + stagePos.y,
  };
}

// ==================== 旋转：本地点 -> 全局米坐标 ====================
interface TableAnchor {
  x: number;
  y: number;
  rotation: number; // 度
}

interface SlotLocal {
  localX: number;
  localY: number;
  angle: number;
}

/**
 * 将桌子本地坐标下的点位转换为画布全局米坐标。
 * PRD §4.3.1 slotToGlobal。
 */
export function slotToGlobal(
  slot: SlotLocal,
  table: TableAnchor,
): { x: number; y: number; angle: number } {
  const rad = (table.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: table.x + (slot.localX * cos - slot.localY * sin),
    y: table.y + (slot.localX * sin + slot.localY * cos),
    angle: slot.angle + table.rotation,
  };
}
