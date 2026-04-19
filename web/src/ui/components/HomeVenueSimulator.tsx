'use client'

import { useMemo, useState } from 'react'

import { STRATEGY_NAME, getTemplateById } from '@/domain'
import type { ElementOverrides, SeatLabelOverrides, SeatOverrides } from '@/ui/components/VenueCanvas'
import { VenueCanvas } from '@/ui/components/VenueCanvas'

export type HomeVenueSimulatorProps = {
  generatedTemplateId?: string
  strategyId?: keyof typeof STRATEGY_NAME
  seed?: number
}

export const HomeVenueSimulator = (props: HomeVenueSimulatorProps) => {
  const { generatedTemplateId, seed, strategyId } = props

  const template = useMemo(() => {
    if (!generatedTemplateId) return undefined
    return getTemplateById(generatedTemplateId)
  }, [generatedTemplateId])

  const [seatOverrides, setSeatOverrides] = useState<SeatOverrides | undefined>(undefined)
  const [elementOverrides, setElementOverrides] = useState<ElementOverrides | undefined>(undefined)
  const [seatLabelOverrides, setSeatLabelOverrides] = useState<SeatLabelOverrides | undefined>(undefined)

  if (!generatedTemplateId || !template || seed === undefined) {
    return (
      <div>
        <div style={{ fontWeight: 650, fontSize: 14 }}>模拟现场</div>
        <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>点击“生成场地”以预览模拟场地</div>
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
      <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>
        已基于模板“{template.name}”生成{strategyId ? ` · ${STRATEGY_NAME[strategyId] ?? strategyId}` : ''}
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>拖拽桌子/门窗/座椅进行微调（网格吸附；仅本页预览，不写入项目）</div>
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
          editable
          onSeatDragEnd={(id, pos) => setSeatOverrides((prev) => ({ ...(prev ?? {}), [id]: pos }))}
          onElementDragEnd={(id, pos) => setElementOverrides((prev) => ({ ...(prev ?? {}), [id]: pos }))}
          onSeatLabelDragEnd={(id, pos) => setSeatLabelOverrides((prev) => ({ ...(prev ?? {}), [id]: pos }))}
        />
      </div>
    </div>
  )
}
