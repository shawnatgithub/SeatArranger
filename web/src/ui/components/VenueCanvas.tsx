'use client'

import type KonvaType from 'konva'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Circle, Group, Layer, Line, Rect, Stage, Text } from 'react-konva'

import type { Seat, VenueElement, VenueTemplate } from '@/domain/models'

export type SeatOverrides = Record<string, { x: number; y: number }>
export type ElementOverrides = Record<string, { x: number; y: number }>
export type SeatLabelOverrides = Record<string, { dx: number; dy: number }>

export type SeatAssignmentView = Record<string, { name: string; locked?: boolean }>

export type VenueCanvasProps = {
  template: VenueTemplate
  seatOverrides?: SeatOverrides
  elementOverrides?: ElementOverrides
  seatLabelOverrides?: SeatLabelOverrides
  assignments?: SeatAssignmentView
  mainSeatId?: string
  editable?: boolean
  stageRef?: React.RefObject<KonvaType.Stage | null>
  onSeatClick?: (seatId: string) => void
  onSeatDragEnd?: (seatId: string, pos: { x: number; y: number }) => void
  onElementDragEnd?: (elementId: string, pos: { x: number; y: number }) => void
  onSeatLabelDragEnd?: (seatId: string, offset: { dx: number; dy: number }) => void
}

const elementFill: Record<VenueElement['type'], string> = {
  table: '#e7e7e7',
  entrance: '#f4f4f4',
  screen: '#dedede',
  window: '#eef7ff',
  hostSeatAnchor: '#dedede',
}

const seatFill = (seat: Seat) => {
  if (seat.zone === 'host') return '#e8f3ff'
  if (seat.zone === 'guest') return '#fff3e8'
  return '#f6f6f6'
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
const snap = (v: number, grid: number) => Math.round(v / grid) * grid

export const VenueCanvas = (props: VenueCanvasProps) => {
  const {
    template,
    seatOverrides,
    elementOverrides,
    seatLabelOverrides,
    assignments,
    mainSeatId,
    editable,
    stageRef,
    onSeatClick,
    onSeatDragEnd,
    onElementDragEnd,
    onSeatLabelDragEnd,
  } = props

  const gridSize = 20
  const roomPadding = 60
  const room = useMemo(() => {
    const x = roomPadding
    const y = roomPadding
    const width = template.canvasWidth - roomPadding * 2
    const height = template.canvasHeight - roomPadding * 2
    return { x, y, width, height }
  }, [template.canvasHeight, template.canvasWidth])

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

  const elements = useMemo(() => {
    const out: VenueElement[] = template.elements.map((el) => {
      const ov = elementOverrides?.[el.id]
      return ov ? { ...el, x: ov.x, y: ov.y } : el
    })
    const hasScreen = out.some((e) => e.type === 'screen')
    const hasEntrance = out.some((e) => e.type === 'entrance')

    if (!hasScreen) {
      const h = Math.round(room.height * 0.3)
      out.push({
        id: 'auto-screen',
        type: 'screen',
        x: room.x + 10,
        y: room.y + Math.round((room.height - h) / 2),
        width: 20,
        height: h,
      })
    }

    if (!hasEntrance) {
      const w = 56
      const h = 18
      out.push({
        id: 'auto-entrance-left',
        type: 'entrance',
        x: room.x + 40,
        y: room.y + room.height - h - 8,
        width: w,
        height: h,
      })
      out.push({
        id: 'auto-entrance-right',
        type: 'entrance',
        x: room.x + room.width - w - 40,
        y: room.y + room.height - h - 8,
        width: w,
        height: h,
      })
    }

    const windowW = Math.round(room.width * 0.5)
    const windowH = 12
    out.push({
      id: 'auto-window',
      type: 'window',
      x: room.x + Math.round((room.width - windowW) / 2),
      y: room.y + 10,
      width: windowW,
      height: windowH,
    })

    return out.map((el) => {
      const ov = elementOverrides?.[el.id]
      return ov ? { ...el, x: ov.x, y: ov.y } : el
    })
  }, [elementOverrides, room.height, room.width, room.x, room.y, template.elements])

  const gridLines = useMemo(() => {
    const xs: number[] = []
    const ys: number[] = []
    for (let x = 0; x <= template.canvasWidth; x += gridSize) xs.push(x)
    for (let y = 0; y <= template.canvasHeight; y += gridSize) ys.push(y)
    return { xs, ys }
  }, [gridSize, template.canvasHeight, template.canvasWidth])

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
        <Layer listening={false}>
          <Rect x={0} y={0} width={template.canvasWidth} height={template.canvasHeight} fill="#ffffff" />

          {gridLines.xs.map((x) => (
            <Line key={`gx_${x}`} points={[x, 0, x, template.canvasHeight]} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
          ))}
          {gridLines.ys.map((y) => (
            <Line key={`gy_${y}`} points={[0, y, template.canvasWidth, y]} stroke="rgba(0,0,0,0.06)" strokeWidth={1} />
          ))}
        </Layer>

        <Layer listening={false}>
          <Rect x={room.x} y={room.y} width={room.width} height={room.height} stroke="rgba(0,0,0,0.22)" strokeWidth={2} cornerRadius={10} />
        </Layer>

        <Layer>
          {elements.map((el) => {
            const draggable = Boolean(editable) && el.type !== 'hostSeatAnchor'
            return (
              <Group
                key={el.id}
                x={el.x}
                y={el.y}
                draggable={draggable}
                onDragEnd={(e) => {
                  const pos = e.target.position()
                  const x = clamp(snap(pos.x, gridSize), room.x, room.x + room.width - el.width)
                  const y = clamp(snap(pos.y, gridSize), room.y, room.y + room.height - el.height)
                  e.target.position({ x, y })
                  onElementDragEnd?.(el.id, { x, y })
                }}
              >
                <Rect
                  x={0}
                  y={0}
                  width={el.width}
                  height={el.height}
                  fill={elementFill[el.type]}
                  stroke="#bdbdbd"
                  cornerRadius={el.type === 'window' ? 10 : 4}
                />
                <Text x={0} y={-18} text={el.type} fontSize={12} fill="#777" />
              </Group>
            )
          })}

          {seats.map((s) => {
            const a = assignments?.[s.id]
            const isMain = s.id === mainSeatId
            const radius = 18
            const labelOffset = seatLabelOverrides?.[s.id] ?? { dx: 0, dy: -radius - 8 }
            return (
              <Group
                key={s.id}
                x={s.x}
                y={s.y}
                draggable={Boolean(editable)}
                onDragEnd={(e) => {
                  const pos = e.target.position()
                  const x = clamp(snap(pos.x, gridSize), room.x + radius, room.x + room.width - radius)
                  const y = clamp(snap(pos.y, gridSize), room.y + radius, room.y + room.height - radius)
                  e.target.position({ x, y })
                  onSeatDragEnd?.(s.id, { x, y })
                }}
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
                  <Group
                    x={labelOffset.dx}
                    y={labelOffset.dy}
                    draggable={Boolean(editable)}
                    onDragEnd={(e) => {
                      const parentPos = e.target.getParent()?.position() ?? { x: s.x, y: s.y }
                      const pos = e.target.position()
                      const absX = parentPos.x + pos.x
                      const absY = parentPos.y + pos.y
                      const snappedX = clamp(snap(absX, gridSize), room.x, room.x + room.width)
                      const snappedY = clamp(snap(absY, gridSize), room.y, room.y + room.height)
                      const dx = snappedX - parentPos.x
                      const dy = snappedY - parentPos.y
                      e.target.position({ x: dx, y: dy })
                      onSeatLabelDragEnd?.(s.id, { dx, dy })
                    }}
                  >
                    <Text text={a.name} fontSize={12} fill="#111" width={140} height={16} offsetX={70} offsetY={0} x={0} y={0} align="center" />
                  </Group>
                ) : null}
              </Group>
            )
          })}
        </Layer>
      </Stage>
    </div>
  )
}
