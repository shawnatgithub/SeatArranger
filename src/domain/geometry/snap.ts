// M1-6 & M1-7: 网格吸附 + 六线对齐辅助
export const GRID_SIZE_METERS = 0.5;
export const SNAP_THRESHOLD = 0.15;

/**
 * 软吸附：仅当值距离最近网格线 < SNAP_THRESHOLD 时吸附，否则保持原值。
 * 负值先 clamp 到 0，再判断吸附。
 */
export function snapToGrid(value: number, gridSize: number = GRID_SIZE_METERS): number {
  const clamped = Math.max(0, value);
  const nearest = Math.round(clamped / gridSize) * gridSize;
  return Math.abs(clamped - nearest) < SNAP_THRESHOLD ? nearest : clamped;
}

// ==================== 六线对齐辅助 ====================
export interface SnapLine {
  position: number; // 米
  orientation: 'horizontal' | 'vertical';
  sourceId?: string;
}

interface AlignableRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 生成场景中所有可用于对齐的候选线（除 excludeId 外）：
 * 每个元素贡献 6 条 —— 左/右/水平中心（vertical）+ 上/下/垂直中心（horizontal）
 */
export function getSnapLines(
  elements: readonly AlignableRect[],
  excludeId: string,
): SnapLine[] {
  const lines: SnapLine[] = [];
  for (const el of elements) {
    if (el.id === excludeId) continue;
    // vertical 线（沿 y 轴延伸，用 x 坐标定位）
    lines.push({ position: el.x, orientation: 'vertical', sourceId: el.id });
    lines.push({ position: el.x + el.width, orientation: 'vertical', sourceId: el.id });
    lines.push({ position: el.x + el.width / 2, orientation: 'vertical', sourceId: el.id });
    // horizontal 线（沿 x 轴延伸，用 y 坐标定位）
    lines.push({ position: el.y, orientation: 'horizontal', sourceId: el.id });
    lines.push({ position: el.y + el.height, orientation: 'horizontal', sourceId: el.id });
    lines.push({ position: el.y + el.height / 2, orientation: 'horizontal', sourceId: el.id });
  }
  return lines;
}

export function findNearestSnapLine(
  value: number,
  lines: readonly SnapLine[],
  orientation: 'horizontal' | 'vertical',
  threshold = 0.2,
): number | null {
  let nearest: number | null = null;
  let minDiff = threshold;
  for (const line of lines) {
    if (line.orientation !== orientation) continue;
    const diff = Math.abs(value - line.position);
    if (diff < minDiff) {
      minDiff = diff;
      nearest = line.position;
    }
  }
  return nearest;
}
