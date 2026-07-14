// M6-8: 拖拽时的六线对齐辅助层
import { Line } from 'react-konva';
import type { SnapLine } from '@/domain/geometry/snap';
import { metersToPixels } from '@/domain/geometry';

export interface SnapLinesLayerProps {
  lines: SnapLine[];
  venueWidth: number;
  venueHeight: number;
  scale: number;
}

export function SnapLinesLayer({ lines, venueWidth, venueHeight, scale }: SnapLinesLayerProps) {
  const wPx = metersToPixels(venueWidth, scale);
  const hPx = metersToPixels(venueHeight, scale);
  return (
    <>
      {lines.map((l, i) => {
        const posPx = metersToPixels(l.position, scale);
        const points =
          l.orientation === 'vertical' ? [posPx, 0, posPx, hPx] : [0, posPx, wPx, posPx];
        return (
          <Line
            key={`snap-${i}`}
            name="snap-line"
            points={points}
            stroke="#ff85c0"
            strokeWidth={1}
            dash={[6, 4]}
            listening={false}
          />
        );
      })}
    </>
  );
}
