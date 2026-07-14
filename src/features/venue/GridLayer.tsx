// M6-2: 0.5m 网格背景
import { useMemo } from 'react';
import { Line } from 'react-konva';
import { metersToPixels } from '@/domain/geometry';
import { GRID_SIZE_METERS } from '@/domain/geometry/snap';
import { useVenueStore } from '@/stores/venue';
import { useUiStore } from '@/stores/ui';

export function GridLayer() {
  const venue = useVenueStore((s) => s.venue);
  const showGrid = useUiStore((s) => s.showGrid);
  const previewMode = useUiStore((s) => s.previewMode);
  const visible = showGrid && !previewMode;

  const lines = useMemo(() => {
    if (!visible) return [] as { key: string; points: number[] }[];
    const arr: { key: string; points: number[] }[] = [];
    const wPx = metersToPixels(venue.width, venue.scale);
    const hPx = metersToPixels(venue.height, venue.scale);
    const stepPx = metersToPixels(GRID_SIZE_METERS, venue.scale);
    // 垂直线（含 0 与最右边界）
    for (let x = 0; x <= wPx + 0.001; x += stepPx) {
      arr.push({ key: `v-${x}`, points: [x, 0, x, hPx] });
    }
    // 水平线
    for (let y = 0; y <= hPx + 0.001; y += stepPx) {
      arr.push({ key: `h-${y}`, points: [0, y, wPx, y] });
    }
    return arr;
  }, [venue.width, venue.height, venue.scale, visible]);

  if (!visible) return null;

  return (
    <>
      {lines.map((l) => (
        <Line
          key={l.key}
          name="grid-line"
          points={l.points}
          stroke="#d9e2ec"
          strokeWidth={0.5}
          dash={[4, 4]}
          listening={false}
        />
      ))}
    </>
  );
}
