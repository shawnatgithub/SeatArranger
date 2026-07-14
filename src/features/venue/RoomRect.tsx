// M6-1: 会议室矩形边框
import { Rect } from 'react-konva';
import { metersToPixels } from '@/domain/geometry';
import { useVenueStore } from '@/stores/venue';

export interface RoomRectProps {
  fill?: string;
  stroke?: string;
}

export function RoomRect({ fill = '#ffffff', stroke = '#8ea3b0' }: RoomRectProps) {
  const venue = useVenueStore((s) => s.venue);
  const w = metersToPixels(venue.width, venue.scale);
  const h = metersToPixels(venue.height, venue.scale);
  return (
    <Rect
      name="room-rect"
      x={0}
      y={0}
      width={w}
      height={h}
      fill={fill}
      stroke={stroke}
      strokeWidth={2}
      listening={false}
    />
  );
}
