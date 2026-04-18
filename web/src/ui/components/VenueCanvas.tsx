'use client'

import type KonvaType from 'konva'
import { useMemo } from 'react'
import { Circle, Group, Layer, Rect, Stage, Text } from 'react-konva'

import type { Seat, VenueElement, VenueTemplate } from '@/domain/models'

export type SeatOverrides = Record<string, { x: number; y: number }>

export type SeatAssignmentView = Record<string, { name: string; locked?: boolean }>

export type VenueCanvasProps = {
  template: VenueTemplate
  seatOverrides?: SeatOverrides
  assignments?: SeatAssignmentView
  mainSeatId?: string
  editable?: boolean
  stageRef?: React.RefObject<KonvaType.Stage | null>
  onSeatClick?: (seatId: string) => void
  onSeatDragEnd?: (seatId: string, pos: { x: number; y: number }) => void
}

const elementFill: Record<VenueElement['type'], string> = {
  table: '#e7e7e7',
  entrance: '#f4f4f4',
  screen: '#dedede',
  hostSeatAnchor: '#dedede',
}

const seatFill = (seat: Seat) => {
  if (seat.zone === 'host') return '#e8f3ff'
  if (seat.zone === 'guest') return '#fff3e8'
  return '#f6f6f6'
}

export const VenueCanvas = (props: VenueCanvasProps) => {
  const {
    template,
    seatOverrides,
    assignments,
    mainSeatId,
    editable,
    stageRef,
    onSeatClick,
    onSeatDragEnd,
  } = props

  const seats = useMemo(
    () =>
      template.seats.map((s) => {
        const ov = seatOverrides?.[s.id]
        return ov ? { ...s, x: ov.x, y: ov.y } : s
      }),
    [seatOverrides, template.seats],
  )

  return (
    <Stage width={template.canvasWidth} height={template.canvasHeight} ref={stageRef}>
      <Layer>
        {template.elements.map((el) => (
          <Group key={el.id}>
            <Rect
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              fill={elementFill[el.type]}
              stroke="#bdbdbd"
              cornerRadius={4}
            />
            <Text
              x={el.x}
              y={el.y - 18}
              text={el.type}
              fontSize={12}
              fill="#777"
            />
          </Group>
        ))}

        {seats.map((s) => {
          const a = assignments?.[s.id]
          const isMain = s.id === mainSeatId
          const radius = 18
          return (
            <Group
              key={s.id}
              x={s.x}
              y={s.y}
              draggable={Boolean(editable)}
              onDragEnd={(e) => onSeatDragEnd?.(s.id, e.target.position())}
              onClick={() => onSeatClick?.(s.id)}
              onTap={() => onSeatClick?.(s.id)}
            >
              <Circle
                radius={radius}
                fill={seatFill(s)}
                stroke={isMain ? '#d64545' : a?.locked ? '#2f6feb' : '#999'}
                strokeWidth={isMain ? 3 : 2}
              />
              <Text
                text={s.id}
                fontSize={10}
                fill="#333"
                align="center"
                verticalAlign="middle"
                width={radius * 2}
                height={radius * 2}
                offsetX={radius}
                offsetY={radius}
              />
              {a?.name ? (
                <Text
                  text={a.name}
                  fontSize={12}
                  fill="#111"
                  width={140}
                  height={16}
                  offsetX={70}
                  offsetY={-radius - 8}
                  x={0}
                  y={0}
                  align="center"
                />
              ) : null}
            </Group>
          )
        })}
      </Layer>
    </Stage>
  )
}

