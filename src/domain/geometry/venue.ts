// M1-3: 房间边界与越界约束
import type { Point } from '@/types';

/** 元素距墙最小间距（米） */
export const VENUE_MARGIN = 0.2;

interface VenueSize {
  width: number;
  height: number;
}

export function isInsideVenue(x: number, y: number, venue: VenueSize): boolean {
  return (
    x >= VENUE_MARGIN &&
    x <= venue.width - VENUE_MARGIN &&
    y >= VENUE_MARGIN &&
    y <= venue.height - VENUE_MARGIN
  );
}

/**
 * 将元素左上角坐标约束在房间内部（考虑元素尺寸和 margin）。
 * 输入超出边界时 clamp 到最近合法位置。
 */
export function constrainToVenue(
  x: number,
  y: number,
  elementWidth: number,
  elementHeight: number,
  venue: VenueSize,
): Point {
  return {
    x: Math.max(VENUE_MARGIN, Math.min(x, venue.width - elementWidth - VENUE_MARGIN)),
    y: Math.max(VENUE_MARGIN, Math.min(y, venue.height - elementHeight - VENUE_MARGIN)),
  };
}
