// M7-1: TableShape — 桌子形状（长桌/圆桌/U 型/主席台）+ 桌号 label
import { useMemo } from 'react';
import { Circle, Group, Rect, Text } from 'react-konva';
import type { Table } from '@/types';
import { metersToPixels } from '@/domain/geometry';

const COLOR_FILL: Record<Table['type'], string> = {
  'conference-long': '#d4b483',
  'training-desk': '#c2c1a5',
  'u-shape': '#b8b5ff',
  round: '#e6a4b4',
  head: '#f7ad48',
};

export interface TableShapeProps {
  table: Table;
  scale: number;
  highlight?: 'none' | 'collision' | 'selected';
  onClick?: () => void;
}

export function TableShape({ table, scale, highlight = 'none', onClick }: TableShapeProps) {
  const px = useMemo(
    () => ({
      cx: metersToPixels(table.x, scale),
      cy: metersToPixels(table.y, scale),
      w: metersToPixels(table.width, scale),
      h: metersToPixels(table.height, scale),
    }),
    [table.x, table.y, table.width, table.height, scale],
  );

  const stroke =
    highlight === 'collision' ? '#ff4d4f' : highlight === 'selected' ? '#1677ff' : '#5b6c7c';
  const strokeWidth = highlight === 'none' ? 1 : 2;

  return (
    <Group
      name={`table-${table.id}`}
      x={px.cx}
      y={px.cy}
      rotation={table.rotation}
      draggable={!table.locked}
      onClick={onClick}
      onTap={onClick}
    >
      {table.type === 'round' ? (
        <Circle
          radius={px.w / 2}
          fill={COLOR_FILL[table.type]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          opacity={table.locked ? 0.8 : 1}
        />
      ) : (
        <Rect
          x={-px.w / 2}
          y={-px.h / 2}
          width={px.w}
          height={px.h}
          fill={COLOR_FILL[table.type]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          cornerRadius={4}
          opacity={table.locked ? 0.8 : 1}
        />
      )}
      <Text
        text={table.tableNumber}
        fontSize={12}
        fontStyle="bold"
        fill="#33475b"
        x={-14}
        y={-8}
        listening={false}
      />
    </Group>
  );
}
