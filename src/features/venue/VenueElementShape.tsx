// M6-3: 场地元素形状 — 拖拽 + 网格吸附 + 越界约束
import { useMemo, useState } from 'react';
import { Group, Rect, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { VenueElement } from '@/types';
import { metersToPixels, pixelsToMeters, constrainToVenue, snapToGrid } from '@/domain/geometry';
import { useVenueStore } from '@/stores/venue';
import { useUiStore } from '@/stores/ui';

const COLORS: Record<VenueElement['type'], string> = {
  wall: '#5b6c7c',
  door: '#a3d0a4',
  window: '#8ecae6',
  pillar: '#7a5c48',
  stage: '#f4a261',
  screen: '#2a9d8f',
};

export interface VenueElementShapeProps {
  element: VenueElement;
}

export function VenueElementShape({ element }: VenueElementShapeProps) {
  const venue = useVenueStore((s) => s.venue);
  const updateElement = useVenueStore((s) => s.updateElement);
  const selectedId = useUiStore((s) => s.selectedId);
  const setSelectedId = useUiStore((s) => s.setSelectedId);
  const [deletingArmed, setDeletingArmed] = useState(false);
  const isSelected = selectedId === element.id;

  const px = useMemo(() => ({
    x: metersToPixels(element.x, venue.scale),
    y: metersToPixels(element.y, venue.scale),
    w: metersToPixels(element.width, venue.scale),
    h: metersToPixels(element.height, venue.scale),
  }), [element.x, element.y, element.width, element.height, venue.scale]);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    const pos = computeDragEndPosition(
      { x: e.target.x(), y: e.target.y() },
      element,
      venue,
    );
    updateElement(element.id, pos);
  };

  const handleClick = () => {
    setSelectedId(element.id);
    // M6-6 两次点击确认删除
    if (deletingArmed) {
      useVenueStore.getState().removeElement(element.id);
      setDeletingArmed(false);
    }
  };

  return (
    <Group
      name={`venue-element-${element.id}`}
      x={px.x}
      y={px.y}
      rotation={element.rotation}
      draggable={!element.locked}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
    >
      <Rect
        width={px.w}
        height={px.h}
        fill={COLORS[element.type]}
        stroke={isSelected ? '#ff4d4f' : deletingArmed ? '#ff4d4f' : '#33475b'}
        strokeWidth={isSelected ? 2 : 1}
        opacity={element.locked ? 0.7 : 1}
      />
      <Text text={element.type} fontSize={10} fill="#fff" x={2} y={2} listening={false} />
    </Group>
  );
}

export function armDeleteForNextClick(setter: (v: boolean) => void) {
  setter(true);
}

/**
 * 拖拽结束时的坐标计算：像素→米→网格吸附→越界约束。导出便于测试。
 */
export function computeDragEndPosition(
  pxPos: { x: number; y: number },
  element: { width: number; height: number },
  venue: { scale: number; width: number; height: number },
): { x: number; y: number } {
  const nextX = pixelsToMeters(pxPos.x, venue.scale);
  const nextY = pixelsToMeters(pxPos.y, venue.scale);
  const snappedX = snapToGrid(nextX);
  const snappedY = snapToGrid(nextY);
  return constrainToVenue(snappedX, snappedY, element.width, element.height, {
    width: venue.width,
    height: venue.height,
  });
}
