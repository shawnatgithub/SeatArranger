// M7-2 & M7-5: ChairShape — 根据 SeatSlot 渲染椅子（绑定 vs 自由漂浮）
import { Circle, Group } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import type { SeatSlot, Table } from '@/types';
import { metersToPixels, slotToGlobal } from '@/domain/geometry';

const CHAIR_RADIUS = 12;

export interface ChairShapeProps {
  slot: SeatSlot;
  table?: Table;
  scale: number;
  occupied: boolean;
  satisfaction?: 'high' | 'medium' | 'low';
  onDoubleClick?: () => void;
}

/**
 * 绑定态：由 slotToGlobal(localX/localY, table) 计算全局米坐标。
 * 解绑态（isFreeFloating=true）：直接使用 slot.freeX/freeY 米坐标。
 */
export function ChairShape({
  slot,
  table,
  scale,
  occupied,
  satisfaction = 'high',
  onDoubleClick,
}: ChairShapeProps) {
  let mx: number;
  let my: number;
  if (slot.isFreeFloating) {
    mx = slot.freeX ?? 0;
    my = slot.freeY ?? 0;
  } else if (table) {
    const g = slotToGlobal(slot, table);
    mx = g.x;
    my = g.y;
  } else {
    mx = slot.localX;
    my = slot.localY;
  }

  const fill = !occupied
    ? '#e6e6e6'
    : satisfaction === 'high'
      ? '#52c41a'
      : satisfaction === 'medium'
        ? '#faad14'
        : '#ff4d4f';

  const handleDbl = (e: KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onDoubleClick?.();
  };

  return (
    <Group
      name={`chair-${slot.id}`}
      x={metersToPixels(mx, scale)}
      y={metersToPixels(my, scale)}
      onDblClick={handleDbl}
      onDblTap={handleDbl}
    >
      <Circle
        radius={CHAIR_RADIUS}
        fill={fill}
        stroke={slot.isFreeFloating ? '#722ed1' : '#5b6c7c'}
        strokeWidth={slot.isFreeFloating ? 2 : 1}
        dash={slot.isFreeFloating ? [3, 3] : undefined}
      />
    </Group>
  );
}
