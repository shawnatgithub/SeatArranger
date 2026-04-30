import { describe, expect, it } from 'vitest'

import { defaultVenueRules, metersToPx } from '@/domain/config/venueRules'
import { ROOM_PADDING, buildRoomTemplate } from '@/domain/services/venueWizard'

const inferWall = (
  room: { x: number; y: number; width: number; height: number },
  el: { x: number; y: number; width: number; height: number },
  eps = 0.001,
) => {
  const rightX = room.x + room.width - el.width
  const bottomY = room.y + room.height - el.height
  if (Math.abs(el.x - room.x) <= eps) return 'left' as const
  if (Math.abs(el.x - rightX) <= eps) return 'right' as const
  if (Math.abs(el.y - room.y) <= eps) return 'top' as const
  if (Math.abs(el.y - bottomY) <= eps) return 'bottom' as const
  return 'unknown' as const
}

describe('venueWizard.buildRoomTemplate anchors', () => {
  it('generates screen/window/doors on different walls and centered, with two doors on one wall', () => {
    const t = buildRoomTemplate({ peopleCount: 12, shape: 'rect' })
    const roomW = t.canvasWidth - ROOM_PADDING * 2
    const roomH = t.canvasHeight - ROOM_PADDING * 2
    const room = { x: -roomW / 2, y: -roomH / 2, width: roomW, height: roomH }

    const screen = t.elements.find((e) => e.id === 'screen-1')!
    const window = t.elements.find((e) => e.id === 'window-1')!
    const doors = t.elements.filter((e) => e.type === 'entrance').sort((a, b) => a.id.localeCompare(b.id))

    expect(doors.length).toBe(2)

    const sw = inferWall(room, screen)
    const ww = inferWall(room, window)
    const dw0 = inferWall(room, doors[0]!)
    const dw1 = inferWall(room, doors[1]!)
    expect(dw0).toBe(dw1)
    expect(sw).not.toBe(ww)
    expect(sw).not.toBe(dw0)
    expect(ww).not.toBe(dw0)

    const centeredX = (el: { x: number; width: number }) => el.x
    const wantCenteredX = (room.x + (room.width - screen.width) / 2)
    if (sw === 'top' || sw === 'bottom') expect(Math.abs(centeredX(screen) - wantCenteredX)).toBeLessThanOrEqual(20)
    else {
      const want = room.y + (room.height - screen.height) / 2
      expect(Math.abs(screen.y - want)).toBeLessThanOrEqual(20)
    }

    const wantWindowX = room.x + (room.width - window.width) / 2
    if (ww === 'top' || ww === 'bottom') expect(Math.abs(window.x - wantWindowX)).toBeLessThanOrEqual(20)
    else {
      const want = room.y + (room.height - window.height) / 2
      expect(Math.abs(window.y - want)).toBeLessThanOrEqual(20)
    }

    const doorWall = dw0
    const doorLen = doorWall === 'top' || doorWall === 'bottom' ? doors[0]!.width : doors[0]!.height
    const doorStart = (d: { x: number; y: number }) => (doorWall === 'top' || doorWall === 'bottom' ? d.x - room.x : d.y - room.y)
    const starts = doors.map((d) => doorStart(d)).sort((a, b) => a - b)
    const gapPx = metersToPx(defaultVenueRules.door.minGapM)
    expect(starts[0]!).toBeGreaterThan(0)
    expect(starts[1]!).toBeGreaterThan(starts[0]! + doorLen + gapPx - 20)

    for (const d of doors) {
      const w = inferWall(room, d)
      if (w === 'top' || w === 'bottom') expect(d.width).toBeGreaterThanOrEqual(d.height)
      else expect(d.height).toBeGreaterThanOrEqual(d.width)
    }
  })
})

