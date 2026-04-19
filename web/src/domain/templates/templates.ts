import type { Seat, VenueElement, VenueTemplate } from '@/domain/models'

const canvasWidth = 900
const canvasHeight = 600

const seat = (id: string, x: number, y: number, zone?: Seat['zone']): Seat => ({
  id,
  x,
  y,
  zone,
})

const element = (
  id: string,
  type: VenueElement['type'],
  x: number,
  y: number,
  width: number,
  height: number,
  directionDeg?: number,
): VenueElement => ({
  id,
  type,
  x,
  y,
  width,
  height,
  directionDeg,
})

export const TEMPLATES: VenueTemplate[] = [
  {
    id: 'long_table_two_sides',
    name: '长桌（双侧座）',
    canvasWidth,
    canvasHeight,
    elements: [
      element('table-1', 'table', 250, 200, 400, 200),
      element('anchor-1', 'hostSeatAnchor', 450, 180, 1, 1),
    ],
    seats: [
      seat('s1', 280, 230, 'host'),
      seat('s2', 280, 280, 'host'),
      seat('s3', 280, 330, 'host'),
      seat('s4', 280, 380, 'host'),
      seat('s5', 280, 430, 'host'),

      seat('s6', 620, 230, 'guest'),
      seat('s7', 620, 280, 'guest'),
      seat('s8', 620, 330, 'guest'),
      seat('s9', 620, 380, 'guest'),
      seat('s10', 620, 430, 'guest'),

      seat('s11', 450, 210, 'neutral'),
      seat('s12', 450, 420, 'neutral'),
    ],
    defaultMainSeatId: 's11',
  },
  {
    id: 'double_rows_screen',
    name: '双排（面向投影）',
    canvasWidth,
    canvasHeight,
    elements: [
      element('anchor-1', 'hostSeatAnchor', 450, 140, 1, 1),
    ],
    seats: [
      ...Array.from({ length: 5 }).flatMap((_, i) => [
        seat(`r1-${i + 1}`, 260 + i * 95, 160, 'neutral'),
        seat(`r2-${i + 1}`, 260 + i * 95, 240, 'neutral'),
        seat(`r3-${i + 1}`, 260 + i * 95, 320, 'neutral'),
      ]),
    ],
    defaultMainSeatId: 'r1-3',
  },
  {
    id: 'u_shape',
    name: 'U 型',
    canvasWidth,
    canvasHeight,
    elements: [
      element('table-1', 'table', 250, 180, 400, 60),
      element('table-2', 'table', 250, 180, 60, 260),
      element('table-3', 'table', 590, 180, 60, 260),
      element('anchor-1', 'hostSeatAnchor', 450, 160, 1, 1),
    ],
    seats: [
      seat('u-top-1', 320, 160),
      seat('u-top-2', 400, 160),
      seat('u-top-3', 480, 160),
      seat('u-left-1', 220, 220),
      seat('u-left-2', 220, 290),
      seat('u-left-3', 220, 360),
      seat('u-right-1', 680, 220),
      seat('u-right-2', 680, 290),
      seat('u-right-3', 680, 360),
      seat('u-bottom-1', 320, 450),
      seat('u-bottom-2', 400, 450),
      seat('u-bottom-3', 480, 450),
    ],
    defaultMainSeatId: 'u-top-2',
  },
  {
    id: 'hollow_square',
    name: '回字形',
    canvasWidth,
    canvasHeight,
    elements: [
      element('table-top', 'table', 260, 170, 380, 60),
      element('table-left', 'table', 260, 170, 60, 260),
      element('table-right', 'table', 580, 170, 60, 260),
      element('table-bottom', 'table', 260, 370, 380, 60),
      element('anchor-1', 'hostSeatAnchor', 450, 150, 1, 1),
    ],
    seats: [
      seat('sq-top-1', 320, 150),
      seat('sq-top-2', 400, 150),
      seat('sq-top-3', 480, 150),
      seat('sq-left-1', 240, 240),
      seat('sq-left-2', 240, 310),
      seat('sq-right-1', 660, 240),
      seat('sq-right-2', 660, 310),
      seat('sq-bottom-1', 320, 470),
      seat('sq-bottom-2', 400, 470),
      seat('sq-bottom-3', 480, 470),
    ],
    defaultMainSeatId: 'sq-top-2',
  },
  {
    id: 'stage',
    name: '主席台（台上/台下）',
    canvasWidth,
    canvasHeight,
    elements: [
      element('table-stage', 'table', 200, 90, 500, 70),
      element('anchor-1', 'hostSeatAnchor', 450, 70, 1, 1),
    ],
    seats: [
      seat('st-1', 330, 70),
      seat('st-2', 390, 70),
      seat('st-3', 450, 70),
      seat('st-4', 510, 70),
      seat('st-5', 570, 70),
      seat('au-1', 260, 240),
      seat('au-2', 360, 240),
      seat('au-3', 460, 240),
      seat('au-4', 560, 240),
      seat('au-5', 660, 240),
      seat('au-6', 260, 320),
      seat('au-7', 360, 320),
      seat('au-8', 460, 320),
      seat('au-9', 560, 320),
      seat('au-10', 660, 320),
    ],
    defaultMainSeatId: 'st-3',
  },
  {
    id: 'round_table_discussion',
    name: '圆桌讨论（会议圆桌）',
    canvasWidth,
    canvasHeight,
    elements: [
      element('table-1', 'table', 300, 170, 300, 300),
      element('anchor-1', 'hostSeatAnchor', 450, 150, 1, 1),
    ],
    seats: [
      seat('rt-1', 450, 120),
      seat('rt-2', 550, 150),
      seat('rt-3', 610, 240),
      seat('rt-4', 590, 350),
      seat('rt-5', 510, 430),
      seat('rt-6', 390, 430),
      seat('rt-7', 310, 350),
      seat('rt-8', 290, 240),
      seat('rt-9', 350, 150),
    ],
    defaultMainSeatId: 'rt-1',
  },
]

export const getTemplateById = (id: string): VenueTemplate | undefined =>
  TEMPLATES.find((t) => t.id === id)
