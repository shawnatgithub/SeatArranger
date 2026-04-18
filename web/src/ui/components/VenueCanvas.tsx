'use client'

import type KonvaType from 'konva'
import { useCallback, useEffect, useMemo, useRef } from 'react'
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

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

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

  const containerRef = useRef<HTMLDivElement | null>(null)
  const localStageRef = useRef<KonvaType.Stage | null>(null)
  const viewRef = useRef({ scale: 1, x: 0, y: 0 })
  const pinchRef = useRef<{ lastDist: number; lastCenter: { x: number; y: number } } | null>(null)

  const setStageNode = useCallback((node: KonvaType.Stage | null) => {
    localStageRef.current = node
    if (stageRef) stageRef.current = node
  }, [stageRef])

  const applyView = useCallback((next: { scale: number; x: number; y: number }) => {
    const stage = localStageRef.current
    if (!stage) return
    viewRef.current = next
    stage.scale({ x: next.scale, y: next.scale })
    stage.position({ x: next.x, y: next.y })
    stage.batchDraw()
  }, [])

  const fitToView = useCallback(() => {
    const stage = localStageRef.current
    const container = containerRef.current
    if (!stage || !container) return

    const w = container.clientWidth
    const h = container.clientHeight
    if (w <= 0 || h <= 0) return

    const padding = 16
    const scale = clamp(
      Math.min((w - padding * 2) / template.canvasWidth, (h - padding * 2) / template.canvasHeight),
      0.1,
      2,
    )
    const x = (w - template.canvasWidth * scale) / 2
    const y = (h - template.canvasHeight * scale) / 2
    stage.size({ width: w, height: h })
    applyView({ scale, x, y })
  }, [applyView, template.canvasHeight, template.canvasWidth])

  const seats = useMemo(
    () =>
      template.seats.map((s) => {
        const ov = seatOverrides?.[s.id]
        return ov ? { ...s, x: ov.x, y: ov.y } : s
      }),
    [seatOverrides, template.seats],
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver(() => fitToView())
    ro.observe(container)
    fitToView()
    return () => ro.disconnect()
  }, [fitToView])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', touchAction: 'none' }}>
      <Stage
        ref={setStageNode}
        draggable
        onMouseDown={(e) => {
          const stage = localStageRef.current
          if (!stage) return
          stage.draggable(e.target === stage)
        }}
        onTouchStart={(e) => {
          const stage = localStageRef.current
          if (!stage) return
          stage.draggable(e.target === stage)
          const touches = e.evt.touches
          if (touches.length !== 2) return
          const rect = stage.container().getBoundingClientRect()
          const p1 = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top }
          const p2 = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top }
          const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)
          pinchRef.current = { lastDist: dist, lastCenter: center }
        }}
        onDblClick={fitToView}
        onDblTap={fitToView}
        onDragEnd={(e) => {
          const pos = e.target.position()
          viewRef.current = { ...viewRef.current, x: pos.x, y: pos.y }
        }}
        onWheel={(e) => {
          e.evt.preventDefault()
          const stage = localStageRef.current
          if (!stage) return
          const pointer = stage.getPointerPosition()
          if (!pointer) return

          const oldScale = viewRef.current.scale
          const scaleBy = 1.06
          const nextScale = clamp(e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy, 0.2, 4)

          const mousePointTo = {
            x: (pointer.x - viewRef.current.x) / oldScale,
            y: (pointer.y - viewRef.current.y) / oldScale,
          }

          const x = pointer.x - mousePointTo.x * nextScale
          const y = pointer.y - mousePointTo.y * nextScale
          applyView({ scale: nextScale, x, y })
        }}
        onTouchMove={(e) => {
          const stage = localStageRef.current
          if (!stage) return
          const touches = e.evt.touches
          if (touches.length !== 2) return
          if (!pinchRef.current) return
          e.evt.preventDefault()

          const rect = stage.container().getBoundingClientRect()
          const p1 = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top }
          const p2 = { x: touches[1].clientX - rect.left, y: touches[1].clientY - rect.top }
          const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y)

          const oldScale = viewRef.current.scale
          const scaleBy = dist / pinchRef.current.lastDist
          const nextScale = clamp(oldScale * scaleBy, 0.2, 4)

          const pointTo = {
            x: (center.x - viewRef.current.x) / oldScale,
            y: (center.y - viewRef.current.y) / oldScale,
          }

          const x = center.x - pointTo.x * nextScale
          const y = center.y - pointTo.y * nextScale
          applyView({ scale: nextScale, x, y })

          pinchRef.current = { lastDist: dist, lastCenter: center }
        }}
        onTouchEnd={() => {
          const stage = localStageRef.current
          if (stage) stage.draggable(true)
          pinchRef.current = null
        }}
        onMouseUp={() => {
          const stage = localStageRef.current
          if (stage) stage.draggable(true)
        }}
      >
        <Layer>
          <Rect x={0} y={0} width={template.canvasWidth} height={template.canvasHeight} fill="#ffffff" />

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
    </div>
  )
}
