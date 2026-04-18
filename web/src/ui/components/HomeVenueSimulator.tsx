'use client'

import { useMemo } from 'react'

import { getTemplateById } from '@/domain'
import type { SeatOverrides } from '@/ui/components/VenueCanvas'
import { VenueCanvas } from '@/ui/components/VenueCanvas'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

const hashString = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const rand01 = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

export type HomeVenueSimulatorProps = {
  generatedTemplateId?: string
  seed?: number
}

export const HomeVenueSimulator = (props: HomeVenueSimulatorProps) => {
  const { generatedTemplateId, seed } = props

  const template = useMemo(() => {
    if (!generatedTemplateId) return undefined
    return getTemplateById(generatedTemplateId)
  }, [generatedTemplateId])

  const seatOverrides = useMemo<SeatOverrides | undefined>(() => {
    if (!template || !seed) return undefined
    const maxJitter = 18
    const out: SeatOverrides = {}
    for (const s of template.seats) {
      const base = seed + hashString(s.id)
      const dx = (rand01(base) - 0.5) * 2 * maxJitter
      const dy = (rand01(base + 1) - 0.5) * 2 * maxJitter
      out[s.id] = {
        x: clamp(s.x + dx, 18, template.canvasWidth - 18),
        y: clamp(s.y + dy, 18, template.canvasHeight - 18),
      }
    }
    return out
  }, [seed, template])

  if (!generatedTemplateId || !template || !seed) {
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
      <div style={{ marginTop: 6, fontSize: 12, color: '#777' }}>已基于模板“{template.name}”生成</div>
      <div
        style={{
          marginTop: 12,
          borderRadius: 12,
          border: '1px solid #e6e6e6',
          overflow: 'hidden',
          width: 'fit-content',
          maxWidth: '100%',
          background: '#fff',
        }}
      >
        <VenueCanvas template={template} seatOverrides={seatOverrides} editable={false} />
      </div>
    </div>
  )
}

