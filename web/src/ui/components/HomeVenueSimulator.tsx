'use client'

import { useState } from 'react'

import type { VenueTemplate } from '@/domain/models'
import { GRID_SIZE, ROOM_PADDING, buildRoomTemplate, generateTablesForLayout, getDefaultRoom } from '@/domain'
import type { ElementOverrides, SeatLabelOverrides, SeatOverrides } from '@/ui/components/VenueCanvas'
import { VenueCanvas } from '@/ui/components/VenueCanvas'

export type HomeVenueSimulatorProps = {
  initialPeopleCount?: number
}

export const HomeVenueSimulator = (props: HomeVenueSimulatorProps) => {
  const { initialPeopleCount } = props

  const [peopleCount, setPeopleCount] = useState<number>(initialPeopleCount ?? 12)
  const [roomShape, setRoomShape] = useState<'rect' | 'square'>('rect')
  const [layoutId, setLayoutId] = useState<'long_table_two_sides' | 'double_rows_screen' | 'u_shape'>('long_table_two_sides')
  const [template, setTemplate] = useState<VenueTemplate | undefined>(undefined)
  const [seatCount, setSeatCount] = useState<number | undefined>(undefined)

  const [seatOverrides, setSeatOverrides] = useState<SeatOverrides | undefined>(undefined)
  const [elementOverrides, setElementOverrides] = useState<ElementOverrides | undefined>(undefined)
  const [seatLabelOverrides, setSeatLabelOverrides] = useState<SeatLabelOverrides | undefined>(undefined)

  const step1GenerateRoom = () => {
    const t = buildRoomTemplate({ peopleCount, shape: roomShape === 'square' ? 'square' : 'rect' })
    setTemplate(t)
    setSeatCount(undefined)
    setSeatOverrides(undefined)
    setElementOverrides(undefined)
    setSeatLabelOverrides(undefined)
  }

  const step2GenerateLayout = () => {
    if (!template) return
    const room = getDefaultRoom(template, ROOM_PADDING)
    const tables = generateTablesForLayout({ layoutId, room, peopleCount })
    const anchors = template.elements.filter((e) => e.type === 'screen' || e.type === 'entrance' || e.type === 'window')
    setTemplate({ ...template, elements: [...anchors, ...tables], seats: [] })
    setSeatCount(undefined)
    setSeatOverrides(undefined)
  }

  const step3GenerateSeats = () => {
    if (!template) return
    setSeatCount(Math.max(1, Math.floor(peopleCount)))
    setSeatOverrides(undefined)
  }

  if (!template) {
    return (
      <div>
        <div style={{ fontWeight: 650, fontSize: 14 }}>模拟现场</div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>按 3 个步骤生成：场地 → 布局 → 座次（示意）</div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ fontSize: 12, color: '#333', display: 'flex', flexDirection: 'column', gap: 6 }}>
            参会人数
            <input
              value={peopleCount}
              type="number"
              min={1}
              step={1}
              onChange={(e) => setPeopleCount(Number(e.target.value))}
              style={{ height: 34, padding: '0 10px', borderRadius: 10, border: '1px solid #dcdcdc', width: 140 }}
            />
          </label>
          <label style={{ fontSize: 12, color: '#333', display: 'flex', flexDirection: 'column', gap: 6 }}>
            房间形状
            <select
              value={roomShape}
              onChange={(e) => setRoomShape(e.target.value as 'rect' | 'square')}
              style={{ height: 34, padding: '0 10px', borderRadius: 10, border: '1px solid #dcdcdc', width: 160 }}
            >
              <option value="rect">长方形（4:3）</option>
              <option value="square">正方形</option>
            </select>
          </label>
          <button
            type="button"
            onClick={step1GenerateRoom}
            style={{
              height: 34,
              padding: '0 14px',
              borderRadius: 10,
              border: '1px solid #222',
              background: '#222',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            生成场地
          </button>
        </div>
        <div
          style={{
            marginTop: 12,
            height: 240,
            borderRadius: 12,
            border: '1px dashed #d7d7d7',
            background: '#fafafa',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#777',
            fontSize: 13,
          }}
        >
          尚未生成
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontWeight: 650, fontSize: 14 }}>模拟现场</div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>{template.name} · 1格={GRID_SIZE}px=1m</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ fontSize: 12, color: '#333', display: 'flex', flexDirection: 'column', gap: 6 }}>
          布局类型
          <select
            value={layoutId}
            onChange={(e) => setLayoutId(e.target.value as typeof layoutId)}
            style={{ height: 34, padding: '0 10px', borderRadius: 10, border: '1px solid #dcdcdc', width: 200 }}
          >
            <option value="long_table_two_sides">长桌（双侧座）</option>
            <option value="double_rows_screen">双排（面向屏幕）</option>
            <option value="u_shape">U 型</option>
          </select>
        </label>
        <button
          type="button"
          onClick={step2GenerateLayout}
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 10,
            border: '1px solid #dcdcdc',
            background: '#fff',
            color: '#111',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          生成布局
        </button>
        <button
          type="button"
          onClick={step3GenerateSeats}
          style={{
            height: 34,
            padding: '0 14px',
            borderRadius: 10,
            border: '1px solid #dcdcdc',
            background: '#fff',
            color: '#111',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          生成座次
        </button>
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>拖拽门/窗/屏幕需贴墙；拖拽桌子/座次圆圈可微调（网格吸附）</div>
      <div
        style={{
          marginTop: 12,
          borderRadius: 12,
          border: '1px solid #e6e6e6',
          overflow: 'hidden',
          width: '100%',
          maxWidth: '100%',
          height: 360,
          background: '#fff',
        }}
      >
        <VenueCanvas
          template={template}
          seatOverrides={seatOverrides}
          elementOverrides={elementOverrides}
          seatLabelOverrides={seatLabelOverrides}
          seatCount={seatCount}
          editable
          onSeatDragEnd={(id, pos) => setSeatOverrides((prev) => ({ ...(prev ?? {}), [id]: pos }))}
          onElementDragEnd={(id, pos) => setElementOverrides((prev) => ({ ...(prev ?? {}), [id]: pos }))}
          onSeatLabelDragEnd={(id, pos) => setSeatLabelOverrides((prev) => ({ ...(prev ?? {}), [id]: pos }))}
        />
      </div>
    </div>
  )
}
