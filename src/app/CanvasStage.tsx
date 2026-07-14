// M5-2: 画布主舞台 — 4 层 Layer 骨架
import { useMemo } from 'react';
import { Stage, Layer } from 'react-konva';
import { useVenueStore } from '@/stores/venue';
import { metersToPixels } from '@/domain/geometry';

export interface CanvasStageProps {
  width?: number;
  height?: number;
  children?: {
    grid?: React.ReactNode;
    venue?: React.ReactNode;
    furniture?: React.ReactNode;
    overlay?: React.ReactNode;
  };
}

/**
 * 4 层 Layer 骨架（自下而上）：
 *  - grid：网格背景
 *  - venue：房间边界 + 门/窗/屏
 *  - furniture：桌椅
 *  - overlay：对齐辅助线 / 冲突高亮 / 选中边框
 */
export function CanvasStage({ width, height, children }: CanvasStageProps) {
  const venue = useVenueStore((s) => s.venue);
  const stageWidth = width ?? metersToPixels(venue.width, venue.scale) + 40;
  const stageHeight = height ?? metersToPixels(venue.height, venue.scale) + 40;
  const offset = useMemo(() => ({ x: 20, y: 20 }), []);

  return (
    <Stage width={stageWidth} height={stageHeight} x={offset.x} y={offset.y} data-testid="canvas-stage">
      <Layer name="grid">{children?.grid}</Layer>
      <Layer name="venue">{children?.venue}</Layer>
      <Layer name="furniture">{children?.furniture}</Layer>
      <Layer name="overlay">{children?.overlay}</Layer>
    </Stage>
  );
}

export default CanvasStage;
